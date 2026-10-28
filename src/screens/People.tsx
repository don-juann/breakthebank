import { useState } from 'react'
import { useStore } from '../store'
import type { Hangout } from '../types'
import { Sheet } from '../ui/Sheet'
import { Press } from '../ui/Press'
import { AddTile, Avatar, PeoplePicker } from '../ui/bits'

interface PersonSheetProps {
  open: boolean
  onClose: () => void
  personId: string | null
  onSaved?: (id: string) => void
  hangoutId?: string
}

export function PersonSheet(props: PersonSheetProps) {
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.personId ? 'Edit friend' : 'New friend'}>
      {props.open && <PersonForm key={props.personId ?? 'new'} {...props} />}
    </Sheet>
  )
}

function PersonForm({ personId, onClose, onSaved, hangoutId }: PersonSheetProps) {
  const existing = useStore((s) => (personId ? s.friends[personId] : undefined))
  const usedIn = useStore((s) => s.hangouts.filter((h) => personId && h.people.includes(personId)).length)
  const [name, setName] = useState(existing?.name ?? '')
  const st = useStore.getState()

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (personId) st.updateFriend(personId, { name: trimmed })
    else {
      const id = st.addFriend({ name: trimmed })
      onSaved?.(id)
    }
    onClose()
  }

  return (
    <div className="form">
      <input
        className="field big"
        placeholder="Name"
        value={name}
        autoFocus={!personId}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <Press className="btn primary wide" disabled={!name.trim()} onClick={save}>
        {personId ? 'Save' : 'Add friend'}
      </Press>
      {personId && hangoutId && (
        <Press
          className="btn danger-ghost wide"
          onClick={() => {
            st.togglePerson(hangoutId, personId)
            onClose()
          }}
        >
          Remove from this hangout
        </Press>
      )}
      {personId && !hangoutId && (
        <Press
          className="btn danger-ghost wide"
          disabled={usedIn > 0}
          onClick={() => {
            st.removeFriend(personId)
            onClose()
          }}
        >
          {usedIn > 0 ? `In ${usedIn} hangout${usedIn > 1 ? 's' : ''}, can't delete` : 'Delete friend'}
        </Press>
      )}
    </div>
  )
}

/** pick who's in a hangout from the saved friends */
export function PeopleSheet({ open, onClose, hangout }: { open: boolean; onClose: () => void; hangout: Hangout }) {
  const friends = useStore((s) => s.friends)
  const [creating, setCreating] = useState(false)
  const list = Object.values(friends).sort((a, b) => a.name.localeCompare(b.name))
  const toggle = (id: string) => useStore.getState().togglePerson(hangout.id, id)
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Who's hanging out?"
      footer={
        <Press className="btn primary wide" onClick={onClose}>
          Done
        </Press>
      }
    >
      {list.length === 0 && <p className="muted">Add your friends once and reuse them in every hangout.</p>}
      <PeoplePicker wrap size={54} people={list} selected={hangout.people} onToggle={toggle}>
        <AddTile label="New" size={54} onClick={() => setCreating(true)} />
      </PeoplePicker>
      <PersonSheet open={creating} personId={null} onClose={() => setCreating(false)} onSaved={toggle} />
    </Sheet>
  )
}

export function FriendsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const friends = useStore((s) => s.friends)
  const [edit, setEdit] = useState<string | null | undefined>(undefined)
  const list = Object.values(friends).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Sheet open={open} onClose={onClose} title="Friends">
      <div className="rows">
        {list.map((p) => (
          <Press key={p.id} className="row" onClick={() => setEdit(p.id)}>
            <Avatar person={p} size={40} />
            <span className="row-main">
              <span className="row-title">{p.name}</span>
            </span>
            <span className="chev">›</span>
          </Press>
        ))}
      </div>
      {list.length === 0 && <p className="muted">No friends yet. Add the people you usually hang out with.</p>}
      <Press className="btn secondary wide" onClick={() => setEdit(null)}>
        + Add friend
      </Press>
      <PersonSheet open={edit !== undefined} personId={edit ?? null} onClose={() => setEdit(undefined)} />
    </Sheet>
  )
}
