import { redirect } from 'next/navigation'

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/admin/events/${id}?tab=checkin`)
}
