import BuildingProfileForm from "@/components/BuildingProfileForm";
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <div className="w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex mb-8">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-slate-200 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-slate-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-slate-100 lg:p-4">
          NetZero Core Control Panel
        </p>
      </div>

      <div className="w-full flex-grow flex items-center justify-center">
        <BuildingProfileForm />
      </div>
    </main>
  );
}