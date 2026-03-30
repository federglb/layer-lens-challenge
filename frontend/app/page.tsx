export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Job Processing System</h1>
      <p className="text-gray-600 mb-8">
        Welcome! Your task is to build the UI for this job processing system.
      </p>

      {/* TODO: Candidate implements their UI here */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
        <p>Your components go here.</p>
        <p className="text-sm mt-2">
          Check out <code className="bg-gray-100 px-1 rounded">utils/</code> for
          pre-built API calls and TypeScript interfaces.
        </p>
      </div>
    </main>
  );
}
