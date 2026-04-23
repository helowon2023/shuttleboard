'use client'
import { useEffect } from 'react'
import { createClient } from './client'

export function useBlockRealtime(
  blockId: string,
  onMatchUpdate: () => void,
) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`block-${blockId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `block_id=eq.${blockId}` },
        onMatchUpdate,
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [blockId, onMatchUpdate])
}

export function useTieRealtime(
  tieId: string,
  onRubberUpdate: () => void,
) {
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`tie-${tieId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rubbers', filter: `tie_id=eq.${tieId}` },
        onRubberUpdate,
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tieId, onRubberUpdate])
}
