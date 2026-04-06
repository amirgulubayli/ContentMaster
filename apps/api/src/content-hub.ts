import { prisma } from "@content-empire/db";
import type { ContentStudioSnapshot, Highlight, MediaAsset as SharedMediaAsset, EditJob as SharedEditJob, ContentCard, Project } from "@content-empire/shared";
import { CreateBucketCommand, GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";

const bucketName = process.env.MINIO_BUCKET ?? "content-empire";
const minioEndpoint = process.env.MINIO_ENDPOINT ?? "minio";
const minioPort = Number(process.env.MINIO_PORT ?? 9000);
const minioUseSsl = process.env.MINIO_USE_SSL === "true";
const rendererUrl = process.env.RENDERER_URL ?? "http://renderer:4300";

let bucketEnsured = false;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: `${minioUseSsl ? "https" : "http"}://${minioEndpoint}:${minioPort}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY ?? "contentempire",
    secretAccessKey: process.env.MINIO_SECRET_KEY ?? "contentempire-secret"
  }
});

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

type JsonLike = unknown;

type ContentItemRecord = {
  id: string;
  projectId: string;
  title: string;
  status: string;
  metadata: JsonLike;
  project: { name: string };
};

type MediaAssetRecord = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  mediaKind: SharedMediaAsset["mediaKind"];
  mimeType: string;
  originalFilename: string;
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  durationSeconds: number | null;
  tags: JsonLike;
  transcriptStatus: SharedMediaAsset["transcriptStatus"];
  transcript: string | null;
  transcriptChecksum: string | null;
  analysisSummary: string | null;
  sentiment: string | null;
  keywords: JsonLike;
  highlights: JsonLike;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string };
};

type EditJobRecord = {
  id: string;
  projectId: string;
  accountId: string | null;
  contentItemId: string | null;
  title: string;
  sourceAssetId: string;
  includeCaptions: boolean;
  status: SharedEditJob["status"];
  instructions: string;
  aspectRatio: string;
  renderTemplate: string;
  transcriptSnapshot: string | null;
  selectedHighlights: JsonLike;
  outputObjectKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  project: { name: string };
  account: { displayName: string } | null;
  sourceAsset: { title: string };
  brollAssets: Array<{
    mediaAssetId: string;
    mediaAsset: { title: string };
  }>;
};

function toStringArray(value: JsonLike): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toHighlightArray(value: JsonLike): Highlight[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const candidate = item as Record<string, unknown>;
    if (
      typeof candidate.label !== "string" ||
      typeof candidate.rationale !== "string" ||
      typeof candidate.score !== "number" ||
      typeof candidate.sourceText !== "string"
    ) {
      return [];
    }

    return [
      {
        label: candidate.label,
        rationale: candidate.rationale,
        score: candidate.score,
        sourceText: candidate.sourceText
      }
    ];
  });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function buildEmbedding(text: string) {
  const tokens = tokenize(text);
  const dimensions = 24;
  const vector = Array.from({ length: dimensions }, () => 0);

  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    vector[digest[0] % dimensions] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item ** 2, 0)) || 1;
  return vector.map((item) => Number((item / magnitude).toFixed(5)));
}

function inferSentiment(text: string) {
  const positive = ["strong", "best", "win", "growth", "launch", "excited", "breakthrough", "confident", "love", "good"];
  const negative = ["risk", "issue", "problem", "drop", "loss", "angry", "bad", "warning", "failed", "decline"];
  const tokens = tokenize(text);
  const positiveHits = tokens.filter((token) => positive.includes(token)).length;
  const negativeHits = tokens.filter((token) => negative.includes(token)).length;

  if (positiveHits > negativeHits) {
    return "positive";
  }

  if (negativeHits > positiveHits) {
    return "negative";
  }

  return "neutral";
}

function buildTranscriptFromText(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 4000);
}

function buildAnalysisText(asset: {
  title: string;
  description: string;
  tags: string[];
  transcript: string | null;
}) {
  return [asset.title, asset.description, asset.tags.join(" "), asset.transcript ?? ""].filter(Boolean).join(" ");
}

function deriveHighlights(asset: {
  title: string;
  tags: string[];
  transcript: string | null;
}): Highlight[] {
  const transcriptSentences = (asset.transcript ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const fromTranscript = transcriptSentences.slice(0, 3).map((sentence, index) => ({
    label: index === 0 ? "Hook" : index === 1 ? "Core insight" : "Closing beat",
    rationale: "Derived from the strongest sentence-level signal in the available transcript.",
    score: Number((0.92 - index * 0.11).toFixed(2)),
    sourceText: sentence
  }));

  if (fromTranscript.length > 0) {
    return fromTranscript;
  }

  return asset.tags.slice(0, 3).map((tag, index) => ({
    label: index === 0 ? "Primary angle" : `Support angle ${index}`,
    rationale: "No transcript was available, so highlights were inferred from title and tags.",
    score: Number((0.74 - index * 0.09).toFixed(2)),
    sourceText: `${asset.title} :: ${tag}`
  }));
}

function buildAnalysisSummary(asset: {
  title: string;
  description: string;
  tags: string[];
  transcript: string | null;
  mediaKind: string;
}) {
  const coverage = asset.transcript ? "Transcript-backed" : "Metadata-backed";
  const topTags = asset.tags.slice(0, 3).join(", ") || "untagged";
  return `${coverage} analysis for ${asset.mediaKind} asset "${asset.title}". Primary angles: ${topTags}. ${asset.description || "No operator description was supplied."}`;
}

function objectDownloadPath(assetId: string) {
  return `/api/content-studio/assets/${assetId}/download`;
}

async function ensureBucket() {
  if (bucketEnsured) {
    return;
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  } catch {
    await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
  }

  bucketEnsured = true;
}

export async function uploadAssetToStorage(params: {
  projectId: string;
  filename: string;
  contentType: string;
  bytes: Buffer;
}) {
  await ensureBucket();

  const objectKey = `${params.projectId}/${Date.now()}-${randomUUID()}-${safeFilename(params.filename)}`;
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: params.bytes,
      ContentType: params.contentType
    })
  );

  return {
    bucket: bucketName,
    objectKey,
    sizeBytes: params.bytes.length
  };
}

function mapContentCard(item: ContentItemRecord): ContentCard {
  const metadata = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : {};
  return {
    id: item.id,
    projectId: item.projectId,
    projectName: item.project.name,
    title: item.title,
    platformTargets: Array.isArray(metadata.platformTargets)
      ? metadata.platformTargets.filter((value): value is ContentCard["platformTargets"][number] => typeof value === "string")
      : ["x"],
    stage:
      item.status === "published" || item.status === "scheduled" || item.status === "ready"
        ? (item.status as ContentCard["stage"])
        : "draft",
    imageProvider: typeof metadata.imageProvider === "string" ? metadata.imageProvider : "asset-library",
    videoPipeline: typeof metadata.videoPipeline === "string" ? metadata.videoPipeline : "content-hub",
    lastEditedBy: typeof metadata.lastEditedBy === "string" ? metadata.lastEditedBy : "Operator",
    nextAction: typeof metadata.nextAction === "string" ? metadata.nextAction : "Review and route to target platforms."
  };
}

function mapMediaAsset(asset: MediaAssetRecord): SharedMediaAsset {
  return {
    id: asset.id,
    projectId: asset.projectId,
    projectName: asset.project.name,
    title: asset.title,
    description: asset.description,
    mediaKind: asset.mediaKind,
    mimeType: asset.mimeType,
    originalFilename: asset.originalFilename,
    bucket: asset.bucket,
    objectKey: asset.objectKey,
    objectUrl: objectDownloadPath(asset.id),
    sizeBytes: asset.sizeBytes,
    durationSeconds: asset.durationSeconds,
    tags: toStringArray(asset.tags),
    transcriptStatus: asset.transcriptStatus,
    transcript: asset.transcript,
    analysisSummary: asset.analysisSummary,
    sentiment: asset.sentiment,
    keywords: toStringArray(asset.keywords),
    highlights: toHighlightArray(asset.highlights),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}

function mapEditJob(job: EditJobRecord): SharedEditJob {
  const highlights = toHighlightArray(job.selectedHighlights);
  return {
    id: job.id,
    projectId: job.projectId,
    projectName: job.project.name,
    accountId: job.accountId,
    accountDisplayName: job.account?.displayName ?? null,
    contentItemId: job.contentItemId,
    title: job.title,
    sourceAssetId: job.sourceAssetId,
    sourceAssetTitle: job.sourceAsset.title,
    brollAssetIds: job.brollAssets.map((item: { mediaAssetId: string }) => item.mediaAssetId),
    brollAssetTitles: job.brollAssets.map((item: { mediaAsset: { title: string } }) => item.mediaAsset.title),
    includeCaptions: job.includeCaptions,
    status: job.status,
    instructions: job.instructions,
    aspectRatio: job.aspectRatio,
    renderTemplate: job.renderTemplate,
    transcriptSnapshot: job.transcriptSnapshot,
    selectedHighlights: highlights,
    outputObjectKey: job.outputObjectKey,
    outputUrl: job.outputObjectKey ? `/api/content-studio/edit-jobs/${job.id}/download` : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

export async function getContentStudioSnapshot(): Promise<ContentStudioSnapshot> {
  const [projects, assets, editJobs, content] = await Promise.all([
    prisma.project.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.mediaAsset.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } }),
    prisma.editJob.findMany({
      include: {
        project: true,
        account: true,
        sourceAsset: true,
        brollAssets: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.contentItem.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } })
  ]);

  return {
    projects: projects.map((project: { id: string; slug: string; name: string; description: string; voice: string; status: Project["status"]; dailyOptimizationEnabled: boolean }) => ({
      id: project.id,
      slug: project.slug,
      name: project.name,
      description: project.description,
      voice: project.voice,
      status: project.status,
      dailyOptimizationEnabled: project.dailyOptimizationEnabled
    })) as Project[],
    assets: assets.map((asset: unknown) => mapMediaAsset(asset as MediaAssetRecord)),
    editJobs: editJobs.map((job: unknown) => mapEditJob(job as EditJobRecord)),
    content: content.map((item: unknown) => mapContentCard(item as ContentItemRecord)),
    stats: {
      assetCount: assets.length,
      analyzedAssetCount: assets.filter((asset: { transcriptStatus: string }) => asset.transcriptStatus === "ready").length,
      editJobCount: editJobs.length,
      renderedJobCount: editJobs.filter((job: { status: string }) => job.status === "completed").length
    }
  };
}

export async function createMediaAssetRecord(params: {
  projectId: string;
  title: string;
  description: string;
  mediaKind: SharedMediaAsset["mediaKind"];
  filename: string;
  contentType: string;
  bytes: Buffer;
  tags: string[];
  transcriptHint?: string | null;
}) {
  const storage = await uploadAssetToStorage({
    projectId: params.projectId,
    filename: params.filename,
    contentType: params.contentType,
    bytes: params.bytes
  });

  const transcript =
    params.transcriptHint && params.transcriptHint.trim().length > 0
      ? buildTranscriptFromText(params.transcriptHint)
      : params.contentType.startsWith("text/")
        ? buildTranscriptFromText(params.bytes.toString("utf8"))
        : null;

  const analysisText = buildAnalysisText({
    title: params.title,
    description: params.description,
    tags: params.tags,
    transcript
  });

  const created = await prisma.mediaAsset.create({
    data: {
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      mediaKind: params.mediaKind,
      mimeType: params.contentType,
      originalFilename: params.filename,
      bucket: storage.bucket,
      objectKey: storage.objectKey,
      sizeBytes: storage.sizeBytes,
      tags: params.tags,
      transcriptStatus: transcript ? "ready" : "pending",
      transcript,
      transcriptChecksum: transcript ? createHash("sha256").update(transcript).digest("hex") : null,
      analysisSummary: transcript
        ? buildAnalysisSummary({
            title: params.title,
            description: params.description,
            tags: params.tags,
            transcript,
            mediaKind: params.mediaKind
          })
        : null,
      sentiment: transcript ? inferSentiment(analysisText) : null,
      keywords: transcript ? tokenize(analysisText).slice(0, 12) : [],
      highlights: transcript ? deriveHighlights({ title: params.title, tags: params.tags, transcript }) : [],
      embedding: buildEmbedding(analysisText)
    },
    include: { project: true }
  });

  return mapMediaAsset(created);
}

export async function analyzeMediaAssetRecord(assetId: string, transcriptHint?: string | null) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    include: { project: true }
  });

  if (!asset) {
    throw new Error("Asset not found");
  }

  const transcript =
    transcriptHint && transcriptHint.trim().length > 0
      ? buildTranscriptFromText(transcriptHint)
      : asset.transcript ?? null;

  const tags = toStringArray(asset.tags);
  const analysisText = buildAnalysisText({
    title: asset.title,
    description: asset.description,
    tags,
    transcript
  });

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      transcriptStatus: transcript ? "ready" : "processing",
      transcript,
      transcriptChecksum: transcript ? createHash("sha256").update(transcript).digest("hex") : asset.transcriptChecksum,
      analysisSummary: buildAnalysisSummary({
        title: asset.title,
        description: asset.description,
        tags,
        transcript,
        mediaKind: asset.mediaKind
      }),
      sentiment: inferSentiment(analysisText),
      keywords: tokenize(analysisText).slice(0, 16),
      highlights: deriveHighlights({ title: asset.title, tags, transcript }),
      embedding: buildEmbedding(analysisText)
    },
    include: { project: true }
  });

  return mapMediaAsset(updated);
}

export async function createEditJobRecord(params: {
  projectId: string;
  accountId?: string | null;
  title: string;
  sourceAssetId: string;
  brollAssetIds: string[];
  includeCaptions: boolean;
  instructions: string;
  aspectRatio: string;
  renderTemplate: string;
}) {
  const [project, account, sourceAsset, brollAssets] = await Promise.all([
    prisma.project.findUnique({ where: { id: params.projectId } }),
    params.accountId ? prisma.platformAccount.findUnique({ where: { id: params.accountId } }) : Promise.resolve(null),
    prisma.mediaAsset.findUnique({ where: { id: params.sourceAssetId } }),
    prisma.mediaAsset.findMany({ where: { id: { in: params.brollAssetIds } } })
  ]);

  if (!project) {
    throw new Error("Project not found");
  }

  if (!sourceAsset) {
    throw new Error("Source asset not found");
  }

  const sourceHighlights = toHighlightArray(sourceAsset.highlights);
  const transcriptSnapshot = sourceAsset.transcript ?? null;
  const renderPlan = {
    sourceAssetId: sourceAsset.id,
    brollAssetIds: brollAssets.map((item: { id: string }) => item.id),
    includeCaptions: params.includeCaptions,
    aspectRatio: params.aspectRatio,
    renderTemplate: params.renderTemplate,
    selectedHighlights: sourceHighlights.slice(0, 3),
    generatedAt: new Date().toISOString()
  };

  const contentItem = await prisma.contentItem.create({
    data: {
      projectId: params.projectId,
      title: params.title,
      body: params.instructions,
      contentType: "video_edit",
      source: "content_hub",
      status: "draft",
      metadata: {
        platformTargets: ["youtube", "tiktok", "instagram"],
        imageProvider: "asset-library",
        videoPipeline: params.renderTemplate,
        lastEditedBy: "Operator",
        nextAction: "Review editor job output and route to publishing."
      }
    }
  });

  const created = await prisma.editJob.create({
    data: {
      projectId: params.projectId,
      accountId: account?.id ?? null,
      contentItemId: contentItem.id,
      title: params.title,
      sourceAssetId: sourceAsset.id,
      includeCaptions: params.includeCaptions,
      status: "queued",
      instructions: params.instructions,
      aspectRatio: params.aspectRatio,
      renderTemplate: params.renderTemplate,
      transcriptSnapshot,
      selectedHighlights: sourceHighlights.slice(0, 3),
      subtitleStyle: {
        enabled: params.includeCaptions,
        preset: "clean-bold"
      },
      renderPlan,
      brollAssets: {
        create: brollAssets.map((asset: { id: string }, index: number) => ({
          mediaAssetId: asset.id,
          role: "b_roll",
          sortOrder: index
        }))
      }
    },
    include: {
      project: true,
      account: true,
      sourceAsset: true,
      brollAssets: { include: { mediaAsset: true }, orderBy: { sortOrder: "asc" } }
    }
  });

  try {
    const response = await fetch(`${rendererUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        projectId: params.projectId,
        template: ["meme", "slideshow", "fade"].includes(params.renderTemplate) ? params.renderTemplate : "slideshow",
        assetIds: [sourceAsset.id, ...brollAssets.map((asset: { id: string }) => asset.id)],
        caption: params.includeCaptions ? transcriptSnapshot ?? params.instructions : undefined
      })
    });

    if (response.ok) {
      await prisma.editJob.update({
        where: { id: created.id },
        data: { status: "rendering" }
      });
      created.status = "rendering";
    }
  } catch {
    // Renderer is optional at creation time; the job record remains queued in Postgres.
  }

  return mapEditJob(created as EditJobRecord);
}

export async function streamMediaAsset(assetId: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    throw new Error("Asset not found");
  }

  const object = await s3Client.send(
    new GetObjectCommand({
      Bucket: asset.bucket,
      Key: asset.objectKey
    })
  );

  return {
    asset,
    body: object.Body,
    contentType: object.ContentType ?? asset.mimeType
  };
}
