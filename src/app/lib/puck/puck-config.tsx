import type { Config } from '@puckeditor/core'
import TopTextConfig from '@/app/lib/puck/components/TopText'
import HighlightsConfig from '@/app/lib/puck/components/Highlights'
import ContainerConfig from '@/app/lib/puck/components/ContainerConfig'
import LatestNewsConfig from '@/app/lib/puck/components/LatestNewsConfig'
import BentoBoxConfig from '@/app/lib/puck/components/BentoBox'
import QuoteConfig from '@/app/lib/puck/components/Quote'
import { InFocusCommencementConfig, InFocusNewStudentsConfig, InFocusProjectsConfig } from '@/app/lib/puck/components/InFocusConfigs'
import StatisticsConfig, { HorizontalStatisticsConfig } from '@/app/lib/puck/components/Statistics'
import HorizontalTopTextConfig from '@/app/lib/puck/components/HorizontalTopText'
import HeroConfig from '@/app/lib/puck/components/HeroConfig'
import GridTextConfig from '@/app/lib/puck/components/GridText'
import AccreditationsConfig from '@/app/lib/puck/components/AccreditationsConfig'
import AlumniConfig from '@/app/lib/puck/components/AlumniConfig'
import CoursesConfig from '@/app/lib/puck/components/CoursesConfig'
import CurriculumConfig from '@/app/lib/puck/components/CurriculumConfig'
import SpecialtiesConfig from '@/app/lib/puck/components/SpecialtiesConfig'
import ContactsConfig from '@/app/lib/puck/components/Contacts'
import ApplicationStepsConfig from '@/app/lib/puck/components/ApplicationStepsConfig'
import AnonymousQuoteConfig from '@/app/lib/puck/components/AnonymousQuote'
import ActivitiesConfig from '@/app/lib/puck/components/ActivitiesConfig'
import ClubsConfig from '@/app/lib/puck/components/ClubsConfig'
import FeaturedProjectsConfig from '@/app/lib/puck/components/FeaturedProjectsConfig'
import ProjectCategoryConfig from '@/app/lib/puck/components/ProjectCategoryConfig'
import ParagraphConfig from '@/app/lib/puck/components/Paragraph'
import HeadingConfig from '@/app/lib/puck/components/Heading'
import SpacerConfig from '@/app/lib/puck/components/Spacer'
import ButtonConfig from '@/app/lib/puck/components/ButtonConfig'
import NewsListConfig from '@/app/lib/puck/components/NewsListConfig'
import { CardConfig } from '@/app/lib/puck/components/Card'
import ProgramEligibilityConfig from '@/app/lib/puck/components/ProgramEligibilityConfig'
import ImageTextLayoutConfig from '@/app/lib/puck/components/ImageTextLayout'
import PeopleConfig from '@/app/lib/puck/components/PeopleConfig'
import ImageGalleryConfig from '@/app/lib/puck/components/ImageGalleryConfig'
import FullscreenVideoConfig from '@/app/lib/puck/components/FullscreenVideoConfig'
import ScatteredImageTextConfig from '@/app/lib/puck/components/ScatteredImageTextConfig'
import HalfScreenImageTextConfig from '@/app/lib/puck/components/HalfScreenImageText'

export const PUCK_CONFIG: Config = {
    components: {
        ScatteredImageTextConfig,
        HalfScreenImageTextConfig,
        ParagraphConfig,
        HeadingConfig,
        ButtonConfig,
        ContainerConfig,
        SpacerConfig,
        TopTextConfig,
        HighlightsConfig,
        LatestNewsConfig,
        BentoBoxConfig,
        QuoteConfig,
        InFocusProjectsConfig,
        InFocusNewStudentsConfig,
        InFocusCommencementConfig,
        StatisticsConfig,
        HorizontalStatisticsConfig,
        HorizontalTopTextConfig,
        HeroConfig,
        GridTextConfig,
        AccreditationsConfig,
        AlumniConfig,
        CoursesConfig,
        CurriculumConfig,
        SpecialtiesConfig,
        ContactsConfig,
        ApplicationStepsConfig,
        AnonymousQuoteConfig,
        ActivitiesConfig,
        ClubsConfig,
        FeaturedProjectsConfig,
        ProjectCategoryConfig,
        NewsListConfig,
        CardConfig,
        ProgramEligibilityConfig,
        ImageTextLayoutConfig,
        PeopleConfig,
        ImageGalleryConfig,
        FullscreenVideoConfig
    },
    categories: {
        foundational: {
            title: '基础与布局',
            components: [
                'HeadingConfig', 'ParagraphConfig', 'ButtonConfig', 'ContainerConfig',
                'SpacerConfig', 'CardConfig', 'GridTextConfig'
            ]
        },
        introductions: {
            title: '首屏与引言',
            components: [ 'HeroConfig', 'TopTextConfig', 'HorizontalTopTextConfig' ]
        },
        imageContent: {
            title: '图文排布',
            components: [ 'ImageTextLayoutConfig', 'HighlightsConfig', 'BentoBoxConfig', 'ScatteredImageTextConfig', 'HalfScreenImageTextConfig' ]
        },
        media: {
            title: '图片轮播与视频',
            components: [ 'ImageGalleryConfig', 'FullscreenVideoConfig' ]
        },
        news: {
            title: '新闻与动态',
            components: [ 'LatestNewsConfig', 'NewsListConfig' ]
        },
        school: {
            title: '学校与人物',
            components: [
                'StatisticsConfig', 'HorizontalStatisticsConfig', 'AccreditationsConfig', 'PeopleConfig',
                'QuoteConfig', 'AnonymousQuoteConfig', 'AlumniConfig'
            ]
        },
        academics: {
            title: '课程与学术',
            components: [
                'CoursesConfig', 'CurriculumConfig', 'SpecialtiesConfig'
            ]
        },
        life: {
            title: '活动与社团',
            components: [
                'ActivitiesConfig', 'ClubsConfig'
            ]
        },
        admissions: {
            title: '招生与联系',
            components: [
                'ProgramEligibilityConfig', 'ApplicationStepsConfig', 'ContactsConfig'
            ]
        },
        projects: {
            title: '学生项目',
            components: [
                'FeaturedProjectsConfig', 'ProjectCategoryConfig'
            ]
        },
        features: {
            title: '专题展示',
            components: [ 'InFocusNewStudentsConfig', 'InFocusProjectsConfig', 'InFocusCommencementConfig' ]
        }
    }
}
