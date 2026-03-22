import type { AggregatedVideo } from "./types.js";
import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { Platform } from "../../database/types/base.js";

const videoRepository = new VideoRepository();
const BILIBILI = Platform.BILIBILI;

const pictureCache = new Map<string, string>();
const pictureLoadTasks = new Map<string, Promise<string | null>>();

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Failed to convert blob to data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

async function savePictureToDatabase(videoId: string, picture: string): Promise<void> {
  await videoRepository.updateVideoPicture(videoId, BILIBILI, picture);
}

export async function fetchAndCachePicture(video: AggregatedVideo): Promise<string | null> {
  if (video.picture) {
    pictureCache.set(video.videoId, video.picture);
    return video.picture;
  }

  if (!video.coverUrl) {
    return null;
  }
  const coverUrl = video.coverUrl;

  const cachedPicture = pictureCache.get(video.videoId);
  if (cachedPicture) {
    video.picture = cachedPicture;
    return cachedPicture;
  }

  const existingTask = pictureLoadTasks.get(video.videoId);
  if (existingTask) {
    return existingTask;
  }

  const task = (async () => {
    try {
      const response = await fetch(coverUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch cover: ${response.status}`);
      }

      const picture = await blobToDataUrl(await response.blob());
      pictureCache.set(video.videoId, picture);
      video.picture = picture;
      await savePictureToDatabase(video.videoId, picture);
      return picture;
    } catch (error) {
      console.warn("[CoverCache] Error caching cover image:", video.videoId, error);
      return null;
    } finally {
      pictureLoadTasks.delete(video.videoId);
    }
  })();

  pictureLoadTasks.set(video.videoId, task);
  return task;
}

export function bindCoverImage(img: HTMLImageElement, video: AggregatedVideo): void {
  const cachedPicture = video.picture || pictureCache.get(video.videoId);
  if (cachedPicture) {
    video.picture = cachedPicture;
    img.src = cachedPicture;
    return;
  }

  if (!video.coverUrl) {
    img.src = "";
    return;
  }

  img.loading = "lazy";
  img.decoding = "async";
  img.src = video.coverUrl;

  void fetchAndCachePicture(video).then((picture) => {
    if (!picture) {
      return;
    }

    if (img.src !== picture) {
      img.src = picture;
    }
  });
}
