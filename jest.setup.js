/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve(null);
      }),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve(null);
      }),
      clear: jest.fn(() => {
        store = {};
        return Promise.resolve(null);
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(store))),
    },
  };
});

jest.mock('react-native-blob-util', () => {
  return {
    __esModule: true,
    default: {
      fs: {
        dirs: {
          DocumentDir: '/mock/DocumentDir',
          CacheDir: '/mock/CacheDir',
        },
        exists: jest.fn(() => Promise.resolve(false)),
        mkdir: jest.fn(() => Promise.resolve()),
        writeFile: jest.fn(() => Promise.resolve()),
        readFile: jest.fn(() => Promise.resolve('')),
        unlink: jest.fn(() => Promise.resolve()),
        stat: jest.fn(() => Promise.resolve({ size: 100 })),
        ls: jest.fn(() => Promise.resolve([])),
        mv: jest.fn(() => Promise.resolve(true)),
        cp: jest.fn(() => Promise.resolve(true)),
      },
      ios: {
        excludeFromBackupKey: jest.fn(() => Promise.resolve()),
      },
      config: jest.fn(() => ({
        fetch: jest.fn(() =>
          Promise.resolve({
            info: () => ({ status: 200 }),
          }),
        ),
      })),
    },
  };
});

