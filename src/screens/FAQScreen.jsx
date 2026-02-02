import { useEffect } from 'react'
import { t } from '../i18n'

export default function FAQScreen({ onBack }) {
  useEffect(() => {
    const footer = document.querySelector('.footer')
    if (!footer) return

    const handleTouchMove = (event) => {
      event.preventDefault()
    }

    const handleTouchStart = (event) => {
      event.stopPropagation()
    }

    footer.addEventListener('touchmove', handleTouchMove, { passive: false })
    footer.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      footer.removeEventListener('touchmove', handleTouchMove)
      footer.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  const faqItems = [
    {
      question: t('faq.question1'),
      answer: t('faq.answer1')
    },
    {
      question: t('faq.question2'),
      answer: t('faq.answer2')
    },
    {
      question: t('faq.question3'),
      answer: t('faq.answer3')
    },
    {
      question: t('faq.question4'),
      answer: t('faq.answer4')
    },
    {
      question: t('faq.question5'),
      answer: t('faq.answer5')
    },
    {
      question: t('faq.question6'),
      answer: t('faq.answer6')
    }
  ]

  return (
    <section className="faq">
      <div className="container">
        <h1 className="title">{t('faq.title')}</h1>
        <div className="faq__list">
          {faqItems.map((item, index) => (
            <div key={index} className="faq__item">
              <p className="faq__question">{item.question}</p>
              <p className="faq__answer">{item.answer}</p>
            </div>
          ))}
          <div className="faq__actions">
            <a href="#" onClick={(e) => { e.preventDefault(); if (onBack) onBack('support'); }} className="faq__button">
              {t('faq.supportButton')}
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

