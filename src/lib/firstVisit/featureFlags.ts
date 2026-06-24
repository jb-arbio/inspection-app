// Section-voice fill ships dark. With the env var unset, SectionVoicePrompts
// renders nothing, no AI snapshots are written, and the read-path fallback is
// inert — behaviour is byte-identical to today.
export const VOICE_FILL_ENABLED = process.env.NEXT_PUBLIC_FV_VOICE_FILL === '1';
