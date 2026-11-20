'use client';
export default function ErrorPage({reset}:{reset:()=>void}) {
  return <div className="shell page"><h1>Something went wrong.</h1><p>The service could not load this page.</p><button onClick={reset}>Try again</button></div>;
}
