import { Suspense } from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { DocumentsClient } from "@/components/documents/document-client";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading documents" />}>
      <DocumentsClient />
    </Suspense>
  );
}
