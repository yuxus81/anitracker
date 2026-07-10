export function SplashLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <img
          src={`${import.meta.env.BASE_URL}icons/icon-192-v2.png`}
          alt="AniTracker"
          width={64}
          height={64}
          className="h-16 w-16 animate-pulse rounded-2xl shadow-glow-purple"
        />
        <h1 className="text-xl font-extrabold text-gradient">YP AniTracker</h1>
        <span
          aria-hidden
          className="h-5 w-5 rounded-full border-2 border-accent-neon border-t-transparent animate-spin-slow"
        />
      </div>
    </div>
  );
}
