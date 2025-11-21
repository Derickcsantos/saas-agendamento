'use client';

import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

export default function PagarmeTabModal({ title, onClose, children }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* BACKDROP */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* MODAL */}
        <motion.div
          className="
            relative z-10 w-full max-w-lg 
            bg-white rounded-2xl shadow-2xl 
            border border-gray-200
            p-8
          "
          initial={{ opacity: 0, scale: 0.90, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.90, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >

          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              {title}
            </h2>

            <button
              onClick={onClose}
              className="
                p-2 rounded-lg 
                text-gray-500 hover:text-gray-900
                hover:bg-gray-100 transition
              "
            >
              <FiX size={20} />
            </button>
          </div>

          {/* CONTENT */}
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {children}
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
