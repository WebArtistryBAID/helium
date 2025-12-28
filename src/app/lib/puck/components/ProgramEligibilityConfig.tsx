import { ComponentConfig } from '@measured/puck'
import EligibilityWizard from '@/app/lib/puck/components/ProgramEligibility'

const ProgramEligibilityConfig: ComponentConfig = {
    label: '招生资格向导',
    render: () => <EligibilityWizard/>
}

export default ProgramEligibilityConfig
