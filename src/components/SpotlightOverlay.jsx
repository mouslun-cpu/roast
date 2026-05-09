import { motion } from 'framer-motion'

export default function SpotlightOverlay() {
  return (
    <motion.div
      className="fixed inset-0 spotlight-overlay pointer-events-none"
      style={{ zIndex: 10 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.9, ease: 'easeOut' }}
    />
  )
}
