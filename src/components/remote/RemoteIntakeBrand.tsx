/** Centered brand mark — welcome screen only. */
export function RemoteIntakeBrand() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground"
        aria-hidden
      >
        OA
      </div>
      <span className="text-sm font-semibold tracking-tight text-foreground">One Assess</span>
    </div>
  );
}
