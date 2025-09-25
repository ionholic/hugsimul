const SAVE_KEY = 'hugsimul-save';
const API_KEY_STORAGE = 'hugsimul-api-key';
const MODEL_STORAGE = 'hugsimul-model-id';
const AUTO_PORTRAIT_STORAGE = 'hugsimul-auto-portrait';

function getStorage(custom) {
  if (custom) return custom;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch (error) {
    console.warn('로컬 저장소 접근 실패', error);
  }
  return null;
}

export function saveGame(engine, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, engine.serialize());
    return true;
  } catch (error) {
    console.warn('게임 저장 실패', error);
    return false;
  }
}

export function loadGame(engine, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    const data = store.getItem(SAVE_KEY);
    if (!data) return false;
    engine.load(data);
    return true;
  } catch (error) {
    console.warn('게임 불러오기 실패', error);
    return false;
  }
}

export function clearSavedGame(storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    store.removeItem(SAVE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

export function loadApiKey(storage = null) {
  const store = getStorage(storage);
  if (!store) return '';
  return store.getItem(API_KEY_STORAGE) || '';
}

export function saveApiKey(value, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    if (value) {
      store.setItem(API_KEY_STORAGE, value);
    } else {
      store.removeItem(API_KEY_STORAGE);
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function clearApiKey(storage = null) {
  return saveApiKey('', storage);
}

export function loadModelId(storage = null) {
  const store = getStorage(storage);
  if (!store) return '';
  return store.getItem(MODEL_STORAGE) || '';
}

export function saveModelId(value, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    if (value) {
      store.setItem(MODEL_STORAGE, value);
    } else {
      store.removeItem(MODEL_STORAGE);
    }
    return true;
  } catch (error) {
    return false;
  }
}

export function loadAutoPortraitEnabled(storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  return store.getItem(AUTO_PORTRAIT_STORAGE) === '1';
}

export function saveAutoPortraitEnabled(enabled, storage = null) {
  const store = getStorage(storage);
  if (!store) return false;
  try {
    if (enabled) {
      store.setItem(AUTO_PORTRAIT_STORAGE, '1');
    } else {
      store.removeItem(AUTO_PORTRAIT_STORAGE);
    }
    return true;
  } catch (error) {
    return false;
  }
}

