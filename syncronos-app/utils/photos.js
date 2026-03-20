const createDraftId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeMimeType = (draft) => {
  if (draft?.mimeType) return draft.mimeType;
  const lowered = `${draft?.fileName || draft?.uri || ''}`.toLowerCase();
  if (lowered.endsWith('.png')) return 'image/png';
  if (lowered.endsWith('.webp')) return 'image/webp';
  if (lowered.endsWith('.heic') || lowered.endsWith('.heif')) return 'image/heic';
  return 'image/jpeg';
};

export const createPhotoDraftFromRemoteUrl = (url) => {
  if (!url) return null;
  return {
    id: `remote-${url}`,
    uri: url,
    remoteUrl: url,
    fileName: url.split('/').pop() || `photo-${createDraftId()}.jpg`,
    mimeType: normalizeMimeType({ uri: url }),
    uploading: false,
  };
};

export const createPhotoDraftFromAsset = (asset) => ({
  id: createDraftId(),
  uri: asset.uri,
  remoteUrl: null,
  fileName: asset.fileName || `photo-${createDraftId()}.jpg`,
  mimeType: asset.mimeType || normalizeMimeType(asset),
  uploading: false,
});

export const normalizePhotoDrafts = (values = [], maxItems = 3) => {
  const drafts = values
    .map((item) => {
      if (!item) return null;
      if (typeof item === 'string') return createPhotoDraftFromRemoteUrl(item);
      return { uploading: false, ...item };
    })
    .slice(0, maxItems);

  while (drafts.length < maxItems) {
    drafts.push(null);
  }

  return drafts;
};

export const getPhotoDraftUri = (draft) => draft?.remoteUrl || draft?.uri || null;

export const extractPhotoUrls = (drafts = []) => drafts
  .filter(Boolean)
  .map((draft) => draft.remoteUrl || draft.uri)
  .filter(Boolean);

const updateDraftAtIndex = (drafts, index, nextDraft) => drafts.map((draft, currentIndex) => (
  currentIndex === index ? nextDraft : draft
));

export async function uploadDraftPhotos({ drafts, userId, request, onDraftsChange }) {
  let nextDrafts = [...drafts];

  for (let index = 0; index < nextDrafts.length; index += 1) {
    const currentDraft = nextDrafts[index];
    if (!currentDraft || currentDraft.remoteUrl) continue;

    const uploadingDraft = { ...currentDraft, uploading: true };
    nextDrafts = updateDraftAtIndex(nextDrafts, index, uploadingDraft);
    onDraftsChange?.(nextDrafts);

    const formData = new FormData();
    formData.append('photo', {
      uri: currentDraft.uri,
      name: currentDraft.fileName || `photo-${currentDraft.id}.jpg`,
      type: normalizeMimeType(currentDraft),
    });

    const response = await request(`/usuarios/${userId}/fotos`, {
      method: 'POST',
      body: formData,
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.mensaje || 'No se pudo subir una de las fotos.');
    }

    const uploadedDraft = {
      ...currentDraft,
      uri: data.url,
      remoteUrl: data.url,
      fileName: data.fileName || currentDraft.fileName,
      mimeType: data.mimeType || currentDraft.mimeType,
      uploading: false,
    };
    nextDrafts = updateDraftAtIndex(nextDrafts, index, uploadedDraft);
    onDraftsChange?.(nextDrafts);
  }

  return nextDrafts;
}
