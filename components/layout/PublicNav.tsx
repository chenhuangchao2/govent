import Link from 'next/link'

export default function PublicNav() {
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/events" className="font-semibold text-gray-900">GovEvent</Link>
        <Link href="/my-registrations" className="text-sm text-blue-600 hover:underline">My Registrations</Link>
      </div>
    </nav>
  )
}
