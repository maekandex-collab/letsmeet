import { BackHeader } from "@/components/Header";

export default function FeedbackPage() {
  return (
    <div className="mobile-shell flex flex-col min-h-screen">
      <BackHeader title="Feedback" backHref="/account" />
      <div className="flex-1 px-5 pt-20 pb-28">
        <p className="text-sm text-muted mt-4 mb-6 leading-5">We&apos;d love to hear from you. Tell us how we can improve LetsMeet!</p>

        {/* Rating */}
        <div className="mb-6">
          <label className="input-label mb-3 block">Rate Your Experience</label>
          <div className="flex gap-3">
            {["😞", "😕", "😐", "😊", "😍"].map((emoji, i) => (
              <button key={i} className="flex-1 aspect-square rounded-2xl border-2 border-border hover:border-primary hover:bg-primary-light text-2xl transition-colors flex items-center justify-center">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">Category</label>
          <div className="input-wrapper">
            <select className="input-field pl-4 pr-10 appearance-none" defaultValue="">
              <option value="" disabled>Select Category</option>
              <option>Bug Report</option>
              <option>Feature Request</option>
              <option>General Feedback</option>
              <option>Account Issue</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="#616568" strokeWidth="2" strokeLinecap="round" /></svg>
            </span>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="feedback-msg">Your Message</label>
          <textarea
            id="feedback-msg"
            rows={5}
            placeholder="Tell us what you think..."
            className="w-full px-4 py-3 rounded-2xl border-2 border-border bg-white text-sm text-dark placeholder-muted resize-none focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="bottom-bar">
        <button className="btn-primary">Submit Feedback</button>
      </div>
    </div>
  );
}
