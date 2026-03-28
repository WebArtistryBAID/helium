import { ComponentConfig } from '@measured/puck'

function BentoBox({
                      title,
                      motto,
                      mottoText,
                      admissionsTitle,
                      admissionsText,
                      facultyTitle,
                      facultyText,
                      countriesTitle,
                      countriesText,
                      academicsTitle,
                      academicsText,
                      lifeText,
                      diversityText
                  }: {
    title: string | null,
    motto: string | null,
    mottoText: string | null,
    admissionsTitle: string | null,
    admissionsText: string | null,
    facultyTitle: string | null,
    facultyText: string | null,
    countriesTitle: string | null,
    countriesText: string | null,
    academicsTitle: string | null,
    academicsText: string | null,
    lifeText: string | null,
    diversityText: string | null
}) {
    return <div className="w-full p-3">
        <h2
            className="uppercase text-center tracking-widest mb-8 text-3xl"
            role="heading">{title}</h2>

        <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 auto-rows-min gap-x-6 gap-y-5 container"
        >
            <div
                className="col-span-1 md:col-span-3 row-span-5 lg:col-start-1 lg:col-span-3 lg:row-start-1 lg:row-span-5 bg-red-700 rounded-3xl p-8 flex text-center justify-center items-center flex-col text-white"
            >
                <h3
                    className="text-4xl font-bold leading-tight mb-5"
                    role="heading">{motto}</h3>

                <img
                    alt="Beijing Academy icon"
                    loading="lazy"
                    className="w-48 h-48 mb-5 p-5 bg-white rounded-full"
                    src="/assets/icon.png"/>

                <p>{mottoText}</p>
            </div>

            <div
                className="col-span-1 md:col-span-5 row-span-4 lg:col-start-4 lg:col-span-5 lg:row-start-1 lg:row-span-4 from-yellow-500/5 to-gray-50 bg-linear-to-br rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
                <div>
                    <h3
                        className="text-2xl leading-tight mb-3 font-bold"
                        role="heading">{admissionsTitle}</h3>
                    <p className="opacity-80 text-sm">{admissionsText}</p>
                </div>
                <div>
                    <img
                        src="/assets/components/bento/stanford.webp"
                        alt="Campus of Stanford University, where students from BAID have been admitted"
                        loading="lazy"
                        className="rounded-3xl w-2xl"/>
                </div>
            </div>

            <div
                className="col-span-1 md:col-span-3 row-span-1 lg:col-start-1 lg:col-span-3 lg:row-start-6 lg:row-span-1 from-orange-500/5 to-gray-50 bg-linear-to-br rounded-3xl p-5 flex items-center">
                <h3
                    className="text-lg"
                    role="heading">
                    {facultyTitle}
                    <br/><span className="font-bold">{facultyText}</span>
                </h3>
                <div
                    aria-hidden="true"
                    className="relative flex justify-center items-end">
                    <img
                        src="/assets/components/bento/lj.jpg"
                        alt=""
                        loading="lazy"
                        className="w-20 h-20 rounded-full relative z-10 translate-x-8 p-1 bg-yellow-100"/>
                    <img
                        src="/assets/components/bento/rj.jpg"
                        alt=""
                        loading="lazy"
                        className="w-20 h-20 rounded-full relative z-20 p-1 bg-amber-100"/>
                    <img
                        src="/assets/components/bento/lx.jpg"
                        alt=""
                        loading="lazy"
                        className="w-20 h-20 rounded-full relative z-30 -translate-x-8 p-1 bg-red-100"/>
                </div>
            </div>

            <div
                className="col-span-1 md:col-span-3 row-span-2 lg:col-start-1 lg:col-span-3 lg:row-start-7 lg:row-span-2 bg-gray-50 rounded-3xl flex items-center gap-3 overflow-hidden">
                <img
                    src="/assets/components/bento/countries.png"
                    alt="Hong Kong SAR China, Australia, Japan, United States, Canada, and United Kingdom"
                    loading="lazy"
                    className="h-48 transform translate-y-5 -translate-x-5"/>
                <div className="py-8 pr-8">
                    <h3
                        className="text-lg mb-1 font-bold"
                        role="heading">{countriesTitle}</h3>
                    <p className="opacity-80 text-sm">{countriesText}</p>
                </div>
            </div>

            <div
                className="col-span-1 md:col-span-3 row-span-4 lg:col-start-4 lg:col-span-3 lg:row-start-5 lg:row-span-4 from-red-500/5 to-gray-50 bg-linear-to-br rounded-3xl overflow-hidden">
                <div className="relative w-full h-48 lg:h-1/2">
                    <div
                        aria-hidden="true"
                        className="flex w-full h-full justify-center items-center text-center"
                    >
                        <svg
                            className="h-24 w-24 bg-red-600 rounded-full p-6"
                            fill="none"
                            stroke="white"
                            strokeWidth="1.5"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <svg
                        className="-z-10 absolute top-0 left-0"
                        height="100%"
                        width="100%"
                        xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern
                                id="dotPattern"
                                height="20"
                                patternUnits="userSpaceOnUse"
                                width="20"
                                x="0"
                                y="0"
                            >
                                <circle
                                    cx="3"
                                    cy="3"
                                    fill="#ccc"
                                    r="1"
                                />
                            </pattern>
                            <linearGradient
                                id="fadeGrad"
                                gradientUnits="objectBoundingBox"
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop
                                    offset="60%"
                                    stopColor="white"
                                    stopOpacity="1"
                                />
                                <stop
                                    offset="100%"
                                    stopColor="white"
                                    stopOpacity="0"
                                />
                            </linearGradient>
                            <mask
                                id="fadeMask"
                                maskContentUnits="objectBoundingBox"
                                maskUnits="objectBoundingBox"
                            >
                                <rect
                                    fill="url(#fadeGrad)"
                                    height="1"
                                    width="1"
                                    x="0"
                                    y="0"
                                />
                            </mask>
                        </defs>
                        <rect
                            fill="url(#dotPattern)"
                            height="100%"
                            mask="url(#fadeMask)"
                            width="100%"
                        />
                    </svg>
                </div>

                <div className="px-8 flex items-center justify-center flex-col text-center">
                    <h3
                        className="text-2xl mb-1 font-bold"
                        role="heading">{academicsTitle}</h3>
                    <p
                        className="opacity-80 text-sm">{academicsText}</p>
                </div>
            </div>

            <div
                style={{ backgroundImage: 'url(/assets/components/bento/life.webp)' }}
                className="hidden sm:flex col-span-1 md:col-span-2 row-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-5 lg:row-span-2 rounded-3xl p-8 bg-cover flex-col justify-end"
            >
                <h3
                    className="text-white text-center font-bold"
                    role="heading">{lifeText}</h3>
            </div>

            <div
                className="col-span-1 md:col-span-2 row-span-2 lg:col-start-7 lg:col-span-2 lg:row-start-7 lg:row-span-2 from-sky-500/5 to-gray-50 bg-linear-to-br rounded-3xl p-8 flex justify-center items-center flex-col text-center">
                <div className="mb-3">
                    <svg
                        className="w-20 h-20 text-blue-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                            strokeLinecap="round"
                            strokeLinejoin="round"/>
                    </svg>
                </div>

                <h3
                    className="text-lg"
                    role="heading">{diversityText}</h3>
            </div>
        </div>
    </div>
}

const BentoBoxConfig: ComponentConfig = {
    label: '午餐盒',
    fields: {
        title: {
            label: '标题',
            type: 'text',
            contentEditable: true
        },
        motto: {
            label: '校训',
            type: 'text',
            contentEditable: true
        },
        mottoText: {
            label: '校训介绍',
            type: 'textarea',
            contentEditable: true
        },
        admissionsTitle: {
            label: '录取标题',
            type: 'text',
            contentEditable: true
        },
        admissionsText: {
            label: '录取介绍',
            type: 'textarea',
            contentEditable: true
        },
        facultyTitle: {
            label: '师资标题',
            type: 'text',
            contentEditable: true
        },
        facultyText: {
            label: '师资介绍',
            type: 'textarea',
            contentEditable: true
        },
        countriesTitle: {
            label: '国家标题',
            type: 'text',
            contentEditable: true
        },
        countriesText: {
            label: '国家介绍',
            type: 'textarea',
            contentEditable: true
        },
        academicsTitle: {
            label: '学术标题',
            type: 'text',
            contentEditable: true
        },
        academicsText: {
            label: '学术介绍',
            type: 'textarea',
            contentEditable: true
        },
        lifeText: {
            label: '校园生活标题',
            type: 'text',
            contentEditable: true
        },
        diversityText: {
            label: '多元性标题',
            type: 'text',
            contentEditable: true
        }
    },
    defaultProps: {
        title: '一览 BAID',
        motto: '世界因我更美好',
        mottoText: '我们的校训，也是我们一切行动的指南',
        admissionsTitle: '优异的录取结果',
        admissionsText: '自 2017 年成立以来，北京中学国际部的学生已被哈佛、斯坦福、帝国理工、麦吉尔、香港大学、东京大学等世界顶尖大学录取。',
        facultyTitle: '优秀的师资队伍',
        facultyText: '93% 拥有硕博学位',
        countriesTitle: '来自北京 面向世界',
        countriesText: '今年，北京中学国际部的毕业生将前往六个国家和地区继续深造。',
        academicsTitle: '学术卓越',
        academicsText: '北京中学国际部提供二十多门 AP 课程、本科级别课程、MFP 科研项目和项目式学习，全面支持学生为大学和未来发展做好准备。',
        lifeText: '享受人生的青葱年华',
        diversityText: '来自六个国家的教师团队'
    },
    render: ({
                 title,
                 motto,
                 mottoText,
                 admissionsTitle,
                 admissionsText,
                 facultyTitle,
                 facultyText,
                 countriesTitle,
                 countriesText,
                 academicsTitle,
                 academicsText,
                 lifeText,
                 diversityText
             }) =>
        <BentoBox
            title={title}
            motto={motto}
            mottoText={mottoText}
            admissionsTitle={admissionsTitle}
            admissionsText={admissionsText}
            facultyTitle={facultyTitle}
            facultyText={facultyText}
            countriesTitle={countriesTitle}
            countriesText={countriesText}
            academicsTitle={academicsTitle}
            academicsText={academicsText}
            lifeText={lifeText}
            diversityText={diversityText}
        />
}

export default BentoBoxConfig
