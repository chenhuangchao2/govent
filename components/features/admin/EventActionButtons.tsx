'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Props {
  eventId: string
  isPublished: boolean
  isCancelled: boolean
}

export default function EventActionButtons({ eventId, isPublished, isCancelled }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  async function doAction(action: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Action failed')
      } else {
        const messages: Record<string, string> = {
          publish: 'Event published — now visible to participants',
          unpublish: 'Event unpublished',
          cancel: 'Event cancelled — all attendees notified',
        }
        toast.success(messages[action] ?? 'Done')
        // Close dialogs before refresh to prevent stale dialog state
        setPublishOpen(false)
        setCancelOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (isCancelled) {
    return <p className="text-sm text-gray-400 italic">This event has been cancelled.</p>
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogTrigger disabled={loading}
          className={`${isPublished ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50`}>
          {isPublished ? 'Unpublish' : 'Publish'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPublished ? 'Unpublish this event?' : 'Publish this event?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isPublished
                ? 'The event will be hidden from the public listing. Existing registrations are not affected.'
                : 'The event will be visible to all eligible participants immediately.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => doAction(isPublished ? 'unpublish' : 'publish')}>
              {isPublished ? 'Unpublish' : 'Publish'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogTrigger disabled={loading}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          Cancel Event
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this event?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All registered and waitlisted participants will be notified by email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Event</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => doAction('cancel')}
              className="bg-red-600 text-white hover:bg-red-700">
              Yes, Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
