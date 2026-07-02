export function SplashLoader() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-bg">
      <div className="flex flex-col items-center gap-4">
        <span className="grid h-16 w-16 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-accent-purple to-blue text-3xl shadow-glow-purple">
          🎬
        </span>
        <h1 className="text-xl font-extrabold text-gradient">YP AniTracker</h1>
        <span
          aria-hidden
          className="h-5 w-5 rounded-full border-2 border-accent-neon border-t-transparent animate-spin-slow"
        />
      </div>
    </div>
  );
}
