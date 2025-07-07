import { useState, useEffect, useCallback } from 'react';

const useInfiniteScroll = (fetchData) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const newData = await fetchData(page);
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
      setHasMore(newData.length > 0);
    } catch (err) {
      console.error('Error loading more data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, fetchData]);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 500
      ) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  return { data, loading, hasMore, loadMore };
};

export default useInfiniteScroll;