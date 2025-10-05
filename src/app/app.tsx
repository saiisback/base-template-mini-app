"use client";

import dynamic from "next/dynamic";

// note: dynamic import is required for components that use the Frame SDK
const OnbaseMeow = dynamic(() => import("~/components/OnbaseMeow"), {
  ssr: false,
});

export default function App() {
  return <OnbaseMeow />;
}
