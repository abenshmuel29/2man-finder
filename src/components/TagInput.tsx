'use client'

import { X } from 'lucide-react'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  list: string[]
  onAdd: () => void
  onRemove: (v: string) => void
}

export default function TagInput({ label, value, onChange, list, onAdd, onRemove }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <div className="flex gap-2">
        <input
          className="input-field flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Add ${label.toLowerCase()} and press Enter`}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd() } }}
        />
        <button type="button" onClick={onAdd}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: '#8B5CF6', color: 'white' }}>
          Add
        </button>
      </div>
      {list.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {list.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{ background: '#252540', border: '1px solid #2D2D50', color: '#C4B5FD' }}>
              {tag}
              <button onClick={() => onRemove(tag)} className="hover:text-white"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
