export default function SuccessPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#171710] text-[#E3DAC9] p-6">
      <h1 className="text-4xl font-bold text-[#FFBF00] mb-4">
        Protection Activated
      </h1>

      <p className="text-[#E3DAC9]/80 text-center max-w-md mb-8">
        Your First Flame subscription has been received.  
        Our goblins are already marching to secure your name across the data wilds.
      </p>

      <a
        href="/"
        className="
          mt-4 px-6 py-3 bg-[#FFBF00] text-[#171710] font-semibold rounded-full
          hover:bg-[#E3DAC9] transition shadow-[0_0_12px_rgba(255,191,0,0.25)]
        "
      >
        Return Home
      </a>
    </main>
  );
}
