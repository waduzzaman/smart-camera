import Link from 'next/link'
 
export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#050505] text-white font-sans">
      <h2 className="text-4xl font-bold mb-4">Not Found</h2>
      <p className="text-slate-400 mb-8">Could not find requested resource</p>
      <Link href="/" className="text-emerald-500 hover:text-emerald-400 underline underline-offset-4">
        Return Home
      </Link>
    </div>
  )
}
