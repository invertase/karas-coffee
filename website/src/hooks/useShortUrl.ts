import { doc } from "firebase/firestore";
import { collections } from "../firebase";
import { Product } from "../types";
import { useFirestoreDocumentData } from "@react-query-firebase/firestore";

export const useShortUrl = (product:Product) => {
    const collection = collections.urls;
  
    const ref = doc(collection, product.id.toLowerCase());
  
    const shortUrl = useFirestoreDocumentData<string>(['shortUrl', product.id], ref);
  
    return shortUrl;
  };
  