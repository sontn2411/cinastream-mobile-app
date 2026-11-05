import { useHistoryStore } from '../src/store/useHistoryStore';
import { MovieItem } from '../src/types/movie';

const mockMovie1: MovieItem = {
  _id: '1',
  name: 'Squid Game 2',
  slug: 'tro-choi-con-muc-2',
  origin_name: 'Squid Game Season 2',
  poster_url: 'https://example.com/poster1.jpg',
  thumb_url: 'https://example.com/thumb1.jpg',
  year: 2024,
  quality: 'FHD',
  lang: 'Vietsub',
};

const mockMovie2: MovieItem = {
  _id: '2',
  name: 'Avatar 3',
  slug: 'avatar-3',
  origin_name: 'Avatar: Fire and Ash',
  poster_url: 'https://example.com/poster2.jpg',
  thumb_url: 'https://example.com/thumb2.jpg',
  year: 2025,
  quality: '4K',
  lang: 'Thuyết Minh',
};

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.getState().clearHistory();
  });

  it('initially has empty history', () => {
    expect(useHistoryStore.getState().history).toEqual([]);
  });

  it('saves progress and orders newest first', () => {
    useHistoryStore.getState().saveProgress({
      movie: mockMovie1,
      episodeName: 'Tập 1',
      episodeSlug: 'tap-1',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 120,
      duration: 3600,
    });

    useHistoryStore.getState().saveProgress({
      movie: mockMovie2,
      episodeName: 'Tập Full',
      episodeSlug: 'tap-full',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 500,
      duration: 7200,
    });

    const { history } = useHistoryStore.getState();
    expect(history).toHaveLength(2);
    expect(history[0].movie.slug).toBe('avatar-3');
    expect(history[1].movie.slug).toBe('tro-choi-con-muc-2');
  });

  it('updates existing movie progress and moves it to the top', () => {
    useHistoryStore.getState().saveProgress({
      movie: mockMovie1,
      episodeName: 'Tập 1',
      episodeSlug: 'tap-1',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 100,
      duration: 3600,
    });

    useHistoryStore.getState().saveProgress({
      movie: mockMovie2,
      episodeName: 'Tập 1',
      episodeSlug: 'tap-1',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 200,
      duration: 3600,
    });

    // Update movie 1 to episode 2
    useHistoryStore.getState().saveProgress({
      movie: mockMovie1,
      episodeName: 'Tập 2',
      episodeSlug: 'tap-2',
      episodeIndex: 1,
      serverIndex: 0,
      currentTime: 450,
      duration: 3600,
    });

    const { history, getHistoryItem } = useHistoryStore.getState();
    expect(history).toHaveLength(2);
    expect(history[0].movie.slug).toBe('tro-choi-con-muc-2');
    expect(history[0].episodeName).toBe('Tập 2');
    expect(history[0].currentTime).toBe(450);

    const item = getHistoryItem('tro-choi-con-muc-2');
    expect(item?.episodeIndex).toBe(1);
    expect(item?.currentTime).toBe(450);
  });

  it('removes history item by slug', () => {
    useHistoryStore.getState().saveProgress({
      movie: mockMovie1,
      episodeName: 'Tập 1',
      episodeSlug: 'tap-1',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 100,
      duration: 3600,
    });

    useHistoryStore.getState().removeHistory('tro-choi-con-muc-2');
    expect(useHistoryStore.getState().history).toHaveLength(0);
    expect(useHistoryStore.getState().getHistoryItem('tro-choi-con-muc-2')).toBeUndefined();
  });

  it('clears all history', () => {
    useHistoryStore.getState().saveProgress({
      movie: mockMovie1,
      episodeName: 'Tập 1',
      episodeSlug: 'tap-1',
      episodeIndex: 0,
      serverIndex: 0,
      currentTime: 100,
      duration: 3600,
    });

    useHistoryStore.getState().clearHistory();
    expect(useHistoryStore.getState().history).toHaveLength(0);
  });
});

