import { useState } from 'react'
import { useStore } from '../store'
import type { Hangout } from '../types'
import { Sheet } from '../ui/Sheet'
import { Press } from '../ui/Press'
import { AddTile, Avatar, PeoplePicker } from '../ui/bits'
import { useT } from '../i18n'

interface PersonSheetProps {
  open: boolean
  onClose: () => void
  personId: string | null
  onSaved?: (id: string) => void
  hangoutId?: string
}

export function PersonSheet(props: PersonSheetProps) {
  const t = useT()
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.personId ? t.editFriend : t.newFriend}>
      {props.open && <PersonForm key={props.personId ?? 'new'} {...props} />}
    </Sheet>
  )
}

function PersonForm({ personId, onClose, onSaved, hangoutId }: PersonSheetProps) {
  const existing = useStore((s) => (personId ? s.friends[personId] : undefined))
  const usedIn = useStore((s) => s.hangouts.filter((h) => personId && h.people.includes(personId)).length)
  const [name, setName] = useState(existing?.name ?? '')
  const st = useStore.getState()
  const t = useT()

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
        placeholder={t.name}
        value={name}
        autoFocus={!personId}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <Press className="btn primary wide" disabled={!name.trim()} onClick={save}>
        {personId ? t.save : t.addFriend}
      </Press>
      {personId && hangoutId && (
        <Press
          className="btn danger-ghost wide"
          onClick={() => {
            st.togglePerson(hangoutId, personId)
            onClose()
          }}
        >
          {t.removeFromHangout}
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
          {usedIn > 0 ? t.inHangouts(usedIn) : t.deleteFriend}
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
  const t = useT()
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.whosComing}
      footer={
        <Press className="btn primary wide" onClick={onClose}>
          {t.done}
        </Press>
      }
    >
      {list.length === 0 && <p className="muted">{t.friendsHint}</p>}
      <PeoplePicker wrap size={54} people={list} selected={hangout.people} onToggle={toggle}>
        <AddTile label={t.newTile} size={54} onClick={() => setCreating(true)} />
      </PeoplePicker>
      <PersonSheet open={creating} personId={null} onClose={() => setCreating(false)} onSaved={toggle} />
    </Sheet>
  )
}

export function FriendsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const friends = useStore((s) => s.friends)
  const [edit, setEdit] = useState<string | null | undefined>(undefined)
  const list = Object.values(friends).sort((a, b) => a.name.localeCompare(b.name))
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={t.friends}>
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
      {list.length === 0 && <p className="muted">{t.noFriends}</p>}
      <Press className="btn secondary wide" onClick={() => setEdit(null)}>
        + {t.addFriend}
      </Press>
      <PersonSheet open={edit !== undefined} personId={edit ?? null} onClose={() => setEdit(undefined)} />
    </Sheet>
  )
}
