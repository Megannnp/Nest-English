import { ArrowRight, Check, Copy, ExternalLink, Mail, Phone } from "lucide-react";
import { useState } from "react";

import { CARD_IMAGE, CONTACT_METHODS, PUBLIC_ACCOUNT } from "./meganContent.js";

export default function MeganContact() {
  const [copied, setCopied] = useState(false);

  const copyWithFallback = (text) => {
    const input = document.createElement("input");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    const ok = document.execCommand("copy");
    input.remove();
    return ok;
  };

  const copyPhoneNumber = async () => {
    if (!CONTACT_METHODS.phone) {
      return;
    }

    // clipboard.writeText rejects when the document lacks focus or the
    // permission is denied; fall back to execCommand rather than letting the
    // button silently do nothing.
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(CONTACT_METHODS.phone);
        ok = true;
      } else {
        ok = copyWithFallback(CONTACT_METHODS.phone);
      }
    } catch {
      ok = copyWithFallback(CONTACT_METHODS.phone);
    }

    if (!ok) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section id="megan-contact" className="mg-section studio-reveal studio-reveal--delay-2">
      <div className="mg-inner mg-contact">
        <img src={CARD_IMAGE} alt="彭静怡 Megan 电子名片，含微信与网站二维码" className="mg-contact__card" loading="lazy" />
        <div className="mg-contact__panel">
          <h2 className="mg-contact__title">联系 Megan</h2>
          <p className="mg-contact__text">
            如果你想交流英语教育、AI 教学工具、课程设计或独立产品实践，可以扫描名片上的微信二维码，或者通过下面的方式找到我。
          </p>
          <div className="mg-contact__links">
            <a
              className="mg-btn mg-btn--ghost"
              href={PUBLIC_ACCOUNT.href}
              aria-label={`打开${PUBLIC_ACCOUNT.name}`}
              target="_blank"
              rel="noreferrer"
            >
              {PUBLIC_ACCOUNT.name} <ExternalLink size={18} aria-hidden="true" />
            </a>
            {CONTACT_METHODS.phone ? (
              <button
                className="mg-btn mg-btn--ghost mg-contact__copy"
                type="button"
                onClick={copyPhoneNumber}
                aria-label={`复制手机号 ${CONTACT_METHODS.phone}`}
              >
                <Phone size={18} aria-hidden="true" />
                <span>{CONTACT_METHODS.phone}</span>
                {copied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
                <span className="mg-contact__copy-status" aria-live="polite">
                  {copied ? "已复制" : ""}
                </span>
              </button>
            ) : null}
            <a className="mg-btn mg-btn--ghost" href={`mailto:${CONTACT_METHODS.email}`} aria-label="发送邮件给 Megan">
              {CONTACT_METHODS.email} <Mail size={18} aria-hidden="true" />
            </a>
            <a className="mg-btn mg-btn--primary" href="/" aria-label="访问筑巢英语首页">
              访问筑巢英语 <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
