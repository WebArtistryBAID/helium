import type { Config } from '@measured/puck'
import TopTextConfig from '@/app/lib/puck/components/TopText'
import HighlightsConfig from '@/app/lib/puck/components/Highlights'
import ContainerConfig from '@/app/lib/puck/components/ContainerConfig'
import LatestNewsConfig from '@/app/lib/puck/components/LatestNewsConfig'
import BentoBoxConfig from '@/app/lib/puck/components/BentoBox'
import QuoteConfig from '@/app/lib/puck/components/Quote'
import { InFocusNewStudentsConfig, InFocusProjectsConfig } from '@/app/lib/puck/components/InFocusConfigs'
import StatisticsConfig from '@/app/lib/puck/components/Statistics'
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

export const PUCK_CONFIG: Config = {
    components: {
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
        StatisticsConfig,
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
        CardConfig
    },
    categories: {
        foundational: {
            title: '基础',
            components: [ 'ParagraphConfig', 'HeadingConfig', 'ButtonConfig', 'CardConfig' ]
        },
        layout: {
            title: '布局',
            components: [ 'ContainerConfig', 'SpacerConfig' ]
        },
        sections: {
            title: '内容区块',
            components: [ 'HeroConfig', 'TopTextConfig', 'HighlightsConfig', 'LatestNewsConfig',
                'BentoBoxConfig', 'NewsListConfig',
                'QuoteConfig', 'StatisticsConfig', 'HorizontalTopTextConfig', 'GridTextConfig',
                'AccreditationsConfig', 'AlumniConfig', 'CoursesConfig', 'CurriculumConfig',
                'SpecialtiesConfig', 'ContactsConfig', 'ApplicationStepsConfig', 'AnonymousQuoteConfig',
                'ActivitiesConfig', 'ClubsConfig', 'FeaturedProjectsConfig', 'ProjectCategoryConfig' ]
        },
        heroes: {
            title: '主题首页',
            components: [ 'InFocusNewStudentsConfig', 'InFocusProjectsConfig' ]
        }
    }
}
