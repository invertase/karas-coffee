import { useFunctionsQuery } from '@react-query-firebase/functions';
import { collections, functions } from '../firebase';
import { getDocs, limit, query, where } from 'firebase/firestore';
import { useFirestoreQueryData } from '@react-query-firebase/firestore';

export function useVectorSearch(key: string | string[],queryString: string, queryLimit: number) {

  let queryKey: string[];
  if (typeof key === 'string') {
    queryKey = [key];
  } else {
    queryKey = key;
  }


  const vectorSearchResults = useFunctionsQuery<
    {
      query: string;
      limit: number;
    },
    string[]
  >(
    ['vectorSearch',...queryKey],
    functions,
    'ext-firestore-vector-search-queryCallable',
    {
      query: queryString,
      limit: queryLimit,
    },
    {},
    {
      enabled: !!queryString,
    },
  );

  const ids = vectorSearchResults.data;

  const q = (ids && ids.length>0) ? query(collections.products, where('id', 'in', ids)) : query(collections.products)

  const results = useFirestoreQueryData(
    ['vectorSearchQueryData',...queryKey],
    q,
    {},
    {
      enabled: !vectorSearchResults.isLoading && !vectorSearchResults.isError && !!ids && ids.length > 1, // Ensure the query is only run when ids are available
    },
  );

  return results;
}
