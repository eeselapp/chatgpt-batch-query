import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth/signin-button";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Daily Digest
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Get AI-curated Twitter updates delivered to your Gmail daily
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Sign in with Google
                </h3>
                <p className="text-sm text-gray-600">
                  Connect your Gmail account securely
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Configure your digest
                </h3>
                <p className="text-sm text-gray-600">
                  Choose Twitter accounts and schedule time
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Receive daily digests
                </h3>
                <p className="text-sm text-gray-600">
                  AI-filtered updates in your inbox
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <SignInButton />
          </div>
        </div>

        <p className="text-center text-sm text-gray-500">
          Your data is secure. We only use Gmail to send you digests.
        </p>
      </div>
    </main>
  );
}




