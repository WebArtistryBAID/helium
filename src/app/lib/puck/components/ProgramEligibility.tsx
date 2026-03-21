'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/app/[[...slug]]/useLanguage'

type Lang = 'zh' | 'en'

type AnswerValue = string | string[] | null

type Answers = Record<string, AnswerValue>

type Rule =
    | { op: 'all'; rules: Rule[] }
    | { op: 'any'; rules: Rule[] }
    | { op: 'not'; rule: Rule }
    | { op: 'eq'; q: string; value: string }
    | { op: 'in'; q: string; values: string[] }
    | { op: 'selected'; q: string; value: string } // checkbox contains value
    | { op: 'date_gte'; q: string; value: string } // YYYY-MM-DD

type EvalResult = { pass: boolean; unknown: boolean }

type Option = {
    value: string
    label: { zh: string; en: string }
}

type Question =
    | {
    id: string
    type: 'single'
    title: { zh: string; en: string }
    helper?: { zh: string; en: string }
    options: Option[]
    required?: boolean
    showIf?: Rule
}
    | {
    id: string
    type: 'date'
    title: { zh: string; en: string }
    helper?: { zh: string; en: string }
    required?: boolean
    showIf?: Rule
}
    | {
    id: string
    type: 'multi'
    title: { zh: string; en: string }
    helper?: { zh: string; en: string }
    options: Option[]
    required?: boolean
    showIf?: Rule
}

type Program = {
    id: string
    name: { zh: string; en: string }
    rule: Rule
    notes?: { zh: string; en: string }
}

const DECISION_TREE: {
    constants: {
        cutoffDobForUnder18: string // inclusive
        chineseCitizenIds: string[]
        hkmoTwIds: string[]
    }
    questions: Question[]
    programs: Program[]
} = {
    constants: {
        cutoffDobForUnder18: '2008-09-01',
        // For the two 中外合作办学项目班, treat these as "Chinese citizen" in the student-identity question.
        chineseCitizenIds: [ 'CN_MAIN', 'CN_HK_PR', 'DUAL' ],
        hkmoTwIds: [ 'CN_HK_PR' ]
    },
    questions: [
        {
            id: 'student_identity',
            type: 'single',
            required: true,
            title: {
                zh: '您学生的国籍或身份情况属于以下哪一类?',
                en: 'Which category best describes the student\'s nationality/immigration status?'
            },
            helper: {
                zh: '请选择最符合学生本人的选项。',
                en: 'Please choose the option that best matches the student.'
            },
            options: [
                {
                    value: 'CN_MAIN',
                    label: {
                        zh: '中国公民，且不具有港澳台永久居住权',
                        en: 'Chinese citizen without Hong Kong, Macau, or Taiwan permanent residency'
                    }
                },
                {
                    value: 'CN_HK_PR',
                    label: {
                        zh: '中国公民，且具有港澳台永久居住权',
                        en: 'Chinese citizen with Hong Kong, Macao, or Taiwan permanent residency'
                    }
                },
                {
                    value: 'NONCN_PR',
                    label: {
                        zh: '非中国公民，持有中华人民共和国外国人永久居留身份证',
                        en: 'Non-Chinese citizen with PRC Foreign Permanent Residence ID Card'
                    }
                },
                {
                    value: 'NONCN_STUDY',
                    label: {
                        zh: '非中国公民，持有在中国允许学习的居留身份 (如父母工作类居留许可)',
                        en: 'Non-Chinese citizen who is legally authorized to study in China (e.g., the student has a parent with a work residence permit)'
                    }
                },
                {
                    value: 'DUAL',
                    label: {
                        zh: '同时具有中国和其他国籍',
                        en: 'Dual citizen of China and another country'
                    }
                }
            ]
        },
        {
            id: 'bj_eligibility',
            type: 'single',
            required: true,
            title: {
                zh: '您学生是否具有北京市普通中学升学资格?',
                en: 'Is the student eligible for entry into Beijing public high schools?'
            },
            helper: {
                zh: '请选择最符合学生本人的选项。请查阅 https://www.bjeea.cn/html/zkzz/faq/2025/1028/87463.html 了解详情。通常，非中国公民不具有该资格 (持有中华人民共和国外国人永久居留身份证的除外)。',
                en: 'Please choose the option that best matches the student. Refer to https://www.bjeea.cn/html/zkzz/faq/2025/1028/87463.html (only in Chinese) for details. Typically, noncitizens are not eligible (except for those with PRC Foreign Permanent Residence ID Cards).'
            },
            options: [
                { value: 'yes', label: { zh: '是', en: 'Yes' } },
                { value: 'no', label: { zh: '否', en: 'No' } },
                { value: 'unsure', label: { zh: '不确定', en: 'Not sure' } }
            ]
        },
        {
            id: 'current_grade',
            type: 'single',
            required: true,
            title: { zh: '您学生目前的在读年级是?', en: 'What is the student\'s current grade level?' },
            helper: {
                zh: '请选择最符合学生本人的选项。',
                en: 'Please choose the option that best matches the student.'
            },
            options: [
                { value: 'g6', label: { zh: '六年级', en: 'Grade 6' } },
                { value: 'g8', label: { zh: '初二', en: 'Grade 8 (Junior 2)' } },
                { value: 'g9', label: { zh: '初三', en: 'Grade 9 (Junior 3)' } },
                { value: 'other', label: { zh: '其他', en: 'Other' } }
            ]
        },
        {
            id: 'dob',
            type: 'date',
            required: true,
            title: { zh: '您学生的出生日期是?', en: 'What is the student\'s date of birth?' },
            helper: {
                zh: '请填写最符合学生本人的内容。',
                en: 'Please fill in content that best matches the student.'
            }
        },
        {
            id: 'is_current_g9',
            type: 'single',
            required: true,
            showIf: { op: 'eq', q: 'current_grade', value: 'g9' },
            title: { zh: '您学生是否为应届初三学生?', en: 'Is the student a current-year (应届) Grade 9 student?' },
            helper: {
                zh: '请选择最符合学生本人的选项。',
                en: 'Please choose the option that best matches the student.'
            },
            options: [
                { value: 'current', label: { zh: '是 (应届)', en: 'Yes (current-year)' } },
                { value: 'past', label: { zh: '否 (往届)', en: 'No (previous-year graduate)' } }
            ]
        },
        {
            id: 'cy_two_year_same_school',
            type: 'single',
            required: true,
            showIf: { op: 'eq', q: 'current_grade', value: 'g8' },
            helper: {
                zh: '请选择最符合学生本人的选项。',
                en: 'Please choose the option that best matches the student.'
            },
            title: {
                zh: '您学生是否在北京市朝阳区同一所学校连续具有两年初中学籍?',
                en: 'Has the student been enrolled for two years at the same middle school in Chaoyang District, Beijing?'
            },
            options: [
                { value: 'yes', label: { zh: '是', en: 'Yes' } },
                { value: 'no', label: { zh: '否', en: 'No' } }
            ]
        },
        {
            id: 'entry_doc_used_hkmo_tw',
            type: 'single',
            required: true,
            showIf: { op: 'in', q: 'student_identity', values: [ 'CN_HK_PR' ] },
            helper: {
                zh: '请选择最符合学生本人的选项。',
                en: 'Please choose the option that best matches the student.'
            },
            title: {
                zh: '您的学生是否正在使用港澳居民来往内地通行证或台湾居民来往大陆通行证进入中国内地?',
                en: 'Has the student entered Mainland China using a Mainland Travel Permit for Hong Kong and Macau Residents or a Mainland Travel Permit for Taiwan Residents?'
            },
            options: [
                { value: 'yes', label: { zh: '是', en: 'Yes' } },
                { value: 'no', label: { zh: '否', en: 'No' } }
            ]
        }
    ],
    programs: [
        {
            id: 'bjms_intl_g10',
            name: {
                zh: '北京中学国际部',
                en: 'Beijing Academy International Division'
            },
            rule: {
                op: 'all',
                rules: [
                    {
                        op: 'any',
                        rules: [
                            {
                                op: 'all',
                                rules: [
                                    { op: 'in', q: 'student_identity', values: [ 'CN_HK_PR' ] },
                                    { op: 'eq', q: 'entry_doc_used_hkmo_tw', value: 'yes' }
                                ]
                            },
                            { op: 'in', q: 'student_identity', values: [ 'CN_MAIN', 'DUAL', 'NONCN_PR' ] }
                        ]
                    },
                    { op: 'eq', q: 'bj_eligibility', value: 'yes' },
                    {
                        op: 'any',
                        rules: [
                            {
                                op: 'all',
                                rules: [
                                    { op: 'eq', q: 'current_grade', value: 'g9' },
                                    { op: 'eq', q: 'is_current_g9', value: 'current' }
                                ]
                            },
                            {
                                op: 'all',
                                rules: [
                                    { op: 'eq', q: 'current_grade', value: 'g9' },
                                    { op: 'eq', q: 'is_current_g9', value: 'past' },
                                    { op: 'date_gte', q: 'dob', value: '2008-09-01' }
                                ]
                            }
                        ]
                    }
                ]
            }
        },
        {
            id: 'bjms_intl_g9_13',
            name: {
                zh: '北京中学国际部',
                en: 'Beijing Academy International Division'
            },
            rule: {
                op: 'all',
                rules: [
                    {
                        op: 'any',
                        rules: [
                            {
                                op: 'all',
                                rules: [
                                    { op: 'in', q: 'student_identity', values: [ 'CN_HK_PR' ] },
                                    { op: 'eq', q: 'entry_doc_used_hkmo_tw', value: 'yes' }
                                ]
                            },
                            { op: 'in', q: 'student_identity', values: [ 'CN_MAIN', 'DUAL', 'NONCN_PR' ] }
                        ]
                    },
                    { op: 'eq', q: 'bj_eligibility', value: 'yes' },
                    { op: 'eq', q: 'current_grade', value: 'g8' },
//                  { op: 'eq', q: 'cy_two_year_same_school', value: 'yes' }
                ]
            }
        },
        {
            id: 'foreign_children_g7',
            name: {
                zh: '北中外籍人员子女学校',
                en: 'International School of Beijing Academy'
            },
            rule: {
                op: 'all',
                rules: [
                    { op: 'eq', q: 'current_grade', value: 'g6' },
                    {
                        op: 'any',
                        rules: [
                            {
                                op: 'all',
                                rules: [
                                    { op: 'in', q: 'student_identity', values: [ 'CN_HK_PR' ] },
                                    { op: 'eq', q: 'entry_doc_used_hkmo_tw', value: 'yes' }
                                ]
                            },
                            {
                                op: 'in',
                                q: 'student_identity',
                                values: [ 'NONCN_PR', 'NONCN_STUDY', 'DUAL' ]
                            }
                        ]
                    }
                ]
            }
        }
    ]
}

function t(lang: Lang, text: { zh: string; en: string }) {
    return lang === 'zh' ? text.zh : text.en
}

function isEmptyAnswer(v: AnswerValue): boolean {
    if (v === null) return true
    if (typeof v === 'string') return v.trim() === ''
    return Array.isArray(v) ? v.length === 0 : true
}

function parseISODate(s: string): Date | null {
    if (!s) return null
    const d = new Date(s + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
}

function evalRule(rule: Rule, answers: Answers): EvalResult {
    const unknown = (pass: boolean): EvalResult => ({ pass, unknown: true })
    const known = (pass: boolean): EvalResult => ({ pass, unknown: false })

    switch (rule.op) {
        case 'all': {
            let anyUnknown = false
            for (const r of rule.rules) {
                const res = evalRule(r, answers)
                if (!res.pass) return { pass: false, unknown: res.unknown || anyUnknown }
                anyUnknown = anyUnknown || res.unknown
            }
            return { pass: true, unknown: anyUnknown }
        }
        case 'any': {
            let anyUnknown = false
            for (const r of rule.rules) {
                const res = evalRule(r, answers)
                if (res.pass) return { pass: true, unknown: res.unknown }
                anyUnknown = anyUnknown || res.unknown
            }
            return { pass: false, unknown: anyUnknown }
        }
        case 'not': {
            const res = evalRule(rule.rule, answers)
            return { pass: !res.pass, unknown: res.unknown }
        }
        case 'eq': {
            const v = answers[rule.q]
            if (v === null || typeof v !== 'string' || v === '') return unknown(false)
            return known(v === rule.value)
        }
        case 'in': {
            const v = answers[rule.q]
            if (v === null || typeof v !== 'string' || v === '') return unknown(false)
            return known(rule.values.includes(v))
        }
        case 'selected': {
            const v = answers[rule.q]
            if (!Array.isArray(v)) return unknown(false)
            if (v.includes('none')) return known(false)
            return known(v.includes(rule.value))
        }
        case 'date_gte': {
            const v = answers[rule.q]
            if (v === null || typeof v !== 'string' || v === '') return unknown(false)
            const d = parseISODate(v)
            const cutoff = parseISODate(rule.value)
            if (!d || !cutoff) return unknown(false)
            return known(d.getTime() >= cutoff.getTime())
        }
        default:
            return { pass: false, unknown: true }
    }
}

function showQuestion(q: Question, answers: Answers): boolean {
    if (!q.showIf) return true
    const res = evalRule(q.showIf, answers)
    if (res.unknown) return false
    return res.pass
}

function getQuestionAnswered(q: Question, answers: Answers): boolean {
    const v = answers[q.id]
    if (q.type === 'multi') {
        return Array.isArray(v) && v.length > 0 && !v.includes('none')
    }
    return !isEmptyAnswer(v)
}

function normalizeMulti(values: string[]): string[] {
    // If "none" is selected, keep only "none".
    if (values.includes('none')) return [ 'none' ]
    return values.filter((x) => x !== 'none')
}

export default function EligibilityWizard() {
    const lang = useLanguage()
    const [ answers, setAnswers ] = useState<Answers>(() => {
        const init: Answers = {}
        for (const q of DECISION_TREE.questions) init[q.id] = null
        return init
    })
    const [ showResults, setShowResults ] = useState(false)

    const visibleQuestions = useMemo(() => {
        return DECISION_TREE.questions.filter((q) => showQuestion(q, answers))
    }, [ answers ])

    const firstUnansweredIndex = useMemo(() => {
        const idx = visibleQuestions.findIndex((q) => !getQuestionAnswered(q, answers))
        return idx === -1 ? visibleQuestions.length - 1 : idx
    }, [ visibleQuestions, answers ])

    const [ step, setStep ] = useState(0)

    useEffect(() => {
        // Keep step within bounds prefer first unanswered.
        const next = Math.max(0, Math.min(firstUnansweredIndex, visibleQuestions.length - 1))
        setStep((prev) => {
            if (prev < 0) return next
            if (prev > visibleQuestions.length - 1) return next
            return prev
        })
    }, [ firstUnansweredIndex, visibleQuestions.length ])

    const current = visibleQuestions[step]

    const allVisibleAnswered = useMemo(() => {
        return visibleQuestions.every((q) => getQuestionAnswered(q, answers))
    }, [ visibleQuestions, answers ])

    const programResults = useMemo(() => {
        const evaluated = DECISION_TREE.programs.map((p) => {
            const res = evalRule(p.rule, answers)
            return { program: p, ...res }
        })

        const eligible = evaluated.filter((x) => x.pass && !x.unknown)
        const maybe = evaluated.filter((x) => x.pass && x.unknown)
        return { eligible, maybe, none: eligible.length === 0 && maybe.length === 0 }
    }, [ answers ])

    function updateAnswer(id: string, value: AnswerValue) {
        setAnswers((prev) => {
            const next = { ...prev, [id]: value }

            // If student_identity changes, clear dependent answers that may become irrelevant.
            if (id === 'student_identity') {
                next['entry_doc_used_hkmo_tw'] = null
            }
            if (id === 'current_grade') {
                next['is_current_g9'] = null
                next['cy_two_year_same_school'] = null
            }
            return next
        })
    }

    function renderQuestion(q: Question) {
        const title = t(lang, q.title)
        const helper = q.helper ? t(lang, q.helper) : ''

        if (q.type === 'single') {
            const v = typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''
            return (
                <div className="space-y-3">
                    <div className="text-base font-semibold">{title}</div>
                    {helper ? <div className="text-sm opacity-80">{helper}</div> : null}
                    <div className="space-y-2">
                        {q.options.map((opt) => {
                            const checked = v === opt.value
                            return (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${
                                        checked ? 'border-indigo-400' : 'border-neutral-700/40'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={q.id}
                                        checked={checked}
                                        onChange={() => updateAnswer(q.id, opt.value)}
                                        className="mt-1"
                                    />
                                    <div className="text-sm">{t(lang, opt.label)}</div>
                                </label>
                            )
                        })}
                    </div>
                </div>
            )
        }

        if (q.type === 'multi') {
            const v = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : []
            return (
                <div className="space-y-3">
                    <div className="text-base font-semibold">{title}</div>
                    {helper ? <div className="text-sm opacity-80">{helper}</div> : null}
                    <div className="space-y-2">
                        {q.options.map((opt) => {
                            const checked = v.includes(opt.value)
                            return (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${
                                        checked ? 'border-indigo-400' : 'border-neutral-700/40'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            const next = e.target.checked ? [ ...v, opt.value ] : v.filter((x) => x !== opt.value)
                                            updateAnswer(q.id, normalizeMulti(next))
                                        }}
                                        className="mt-1"
                                    />
                                    <div className="text-sm">{t(lang, opt.label)}</div>
                                </label>
                            )
                        })}
                    </div>
                </div>
            )
        }

        // date
        const v = typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''
        return (
            <div className="space-y-3">
                <div className="text-base font-semibold">{title}</div>
                {helper ? <div className="text-sm opacity-80">{helper}</div> : null}
                <input
                    type="date"
                    value={v}
                    onChange={(e) => updateAnswer(q.id, e.target.value)}
                    className="w-full rounded-xl border border-neutral-700/40 bg-transparent p-3 text-sm"
                />
            </div>
        )
    }

    const canGoNext = current ? getQuestionAnswered(current, answers) : false

    return (
        <div className="w-full max-w-3xl mx-auto p-4">
            <div className="rounded-2xl border border-neutral-700/40 p-5 space-y-4">
                <div className="space-y-2">
                    <div className="text-xl font-semibold">
                        {lang === 'zh' ? '招生资格' : 'Eligibility Wizard'}
                    </div>
                    <div className="text-sm opacity-85">
                        {lang === 'zh'
                            ? '回答一些问题即可了解学生可申请的招生项目。'
                            : 'Answer a few questions to see which programs the student may be eligible to apply for.'}
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm opacity-80">
                    <div>
                        {lang === 'zh'
                            ? `进度: ${Math.min(step + 1, visibleQuestions.length)}/${visibleQuestions.length}`
                            : `Progress: ${Math.min(step + 1, visibleQuestions.length)}/${visibleQuestions.length}`}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            // Reset
                            const init: Answers = {}
                            for (const q of DECISION_TREE.questions) init[q.id] = null
                            setAnswers(init)
                            setShowResults(false)
                            setStep(0)
                        }}
                        className="rounded-xl border border-neutral-700/40 cursor-pointer px-3 py-1.5 hover:border-neutral-500/60"
                    >
                        {lang === 'zh' ? '重置' : 'Reset'}
                    </button>
                </div>

                <div className="rounded-2xl border border-neutral-700/40 p-4">
                    {current ? renderQuestion(current) : null}
                </div>

                <div className="flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        disabled={step <= 0}
                        className={`rounded-xl px-4 py-2 border ${
                            step <= 0 ? 'opacity-40 cursor-not-allowed border-neutral-700/40' : 'border-neutral-700/40 cursor-pointer hover:border-neutral-500/60'
                        }`}
                    >
                        {lang === 'zh' ? '上一步' : 'Back'}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowResults(true)}
                            disabled={!allVisibleAnswered && (canGoNext || step < visibleQuestions.length)}
                            className={`rounded-xl px-4 py-2 border ${
                                allVisibleAnswered ? 'border-indigo-500/70 cursor-pointer hover:border-indigo-400' :
                                    (canGoNext || step < visibleQuestions.length
                                        ? 'opacity-40 cursor-not-allowed border-neutral-700/40'
                                        : 'border-neutral-700/40 cursor-pointer hover:border-neutral-500/60')
                            }`}
                        >
                            {lang === 'zh' ? '查看结果' : 'View Results'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep((s) => Math.min(visibleQuestions.length - 1, s + 1))}
                            disabled={!canGoNext || step >= visibleQuestions.length - 1}
                            className={`rounded-xl px-4 py-2 border ${
                                !canGoNext || step >= visibleQuestions.length - 1
                                    ? 'opacity-40 cursor-not-allowed border-neutral-700/40'
                                    : 'border-neutral-700/40 cursor-pointer hover:border-neutral-500/60'
                            }`}
                        >
                            {lang === 'zh' ? '下一步' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>

            {showResults ? (
                <div className="mt-4 rounded-2xl border border-neutral-700/40 p-5 space-y-3">
                    <div className="text-lg font-semibold">{lang === 'zh' ? '结果' : 'Results'}</div>

                    {programResults.none ? (
                        <div className="space-y-2">
                            <div className="text-sm">
                                {lang === 'zh'
                                    ? '当前条件不符合任何招生项目。请注意，本资格向导并未覆盖北京中学国际部的所有招生项目，也未覆盖转学入学。您可能可以通过其他方式或转学入学，详情请咨询招生办公室。'
                                    : 'Based on the current answers, the student is not eligible for any programs. Please note that this eligibility wizard has not covered all admission programs at BAID. You may be eligible for alternative admission programs or transfer admissions. Please contact the Admissions Office for details.'}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {programResults.eligible.length > 0 ? (
                                <div className="space-y-2">
                                    <div
                                        className="text-sm font-semibold">{lang === 'zh' ? '可申请项目' : 'Eligible Programs'}</div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {programResults.eligible.map(({ program }) => (
                                            <li key={program.id}>{t(lang, program.name)}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}

                            {programResults.maybe.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="text-sm font-semibold">
                                        {lang === 'zh' ? '可能具有资格' : 'Possibly Eligible'}
                                    </div>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        {programResults.maybe.map(({ program }) => (
                                            <li key={program.id}>{t(lang, program.name)}</li>
                                        ))}
                                    </ul>
                                    <div className="text-xs opacity-80">
                                        {lang === 'zh'
                                            ? '您未填写某些信息，或选取了「不确定」。因此，我们不能完全确定您的入学资格。'
                                            : 'You did not answer some questions, or selected "not sure." Therefore, we are uncertain about your eligibility.'}
                                    </div>
                                </div>
                            ) : null}

                            <div className="pt-2 text-sm">
                                {lang === 'zh'
                                    ? '这一结果仅供参考，且不代表资格审查或招生结果。有关确切的资格信息，请咨询招生办公室了解详情。'
                                    : 'This result is for reference only and does not indicate eligibility or represent admissions decisions. To confirm the student\'s eligibility, please contact the Admissions Office.'}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}
