import { FileNode, PhraseCategory } from './types';

export const ACADEMIC_PHRASES: PhraseCategory[] = [
  {
    id: 'intro_importance',
    title: 'Introduction: Establishing Importance',
    phrases: [
      "X is a major area of interest within the field of...",
      "The issue of X has received considerable critical attention.",
      "Recent developments in X have heightened the need for...",
      "In recent years, there has been an increasing interest in...",
      "The significance of X has recently been recognized in...",
      "X plays a crucial role in..."
    ]
  },
  {
    id: 'intro_gap',
    title: 'Introduction: Highlighting a Gap',
    phrases: [
      "However, far too little attention has been paid to...",
      "Previous studies have failed to address...",
      "The research to date has tended to focus on X rather than Y.",
      "A key limitation of this prior work is that it...",
      "Although extensive research has been carried out on X, no single study exists which...",
      "However, there is a general lack of research in..."
    ]
  },
  {
    id: 'lit_general',
    title: 'Literature: General Reference',
    phrases: [
      "A number of studies have postulated that...",
      "Surveys such as that conducted by Smith (2023) have shown that...",
      "Traditionally, it has been argued that...",
      "Numerous studies have attempted to explain...",
      "Recent evidence suggests that...",
      "Previous research has documented..."
    ]
  },
  {
    id: 'lit_critical',
    title: 'Literature: Critical Analysis',
    phrases: [
      "However, this approach fails to account for...",
      "One major drawback of this approach is...",
      "The main weakness of the study is the failure to address...",
      "Ideally, these findings should be replicated in a study where...",
      "Most studies in the field of X have only focused on...",
      "However, these results were based upon data from..."
    ]
  },
  {
    id: 'method_process',
    title: 'Methodology: Describing Process',
    phrases: [
      "Data for this study were retrospectively collected from...",
      "The initial sample consisted of...",
      "The participants were divided into two groups based on...",
      "This approach was chosen because it ensures...",
      "In order to identify X, the following criteria were used...",
      "The research data was drawn from...",
      "A qualitative/quantitative approach was adopted..."
    ]
  },
  {
    id: 'results_reporting',
    title: 'Results: Reporting Findings',
    phrases: [
      "The table/figure illustrates...",
      "What stands out in the table is...",
      "The results indicate that...",
      "There is a clear trend of...",
      "As shown in Figure 1, there is a significant difference between...",
      "From the graph, it is apparent that..."
    ]
  },
  {
    id: 'results_compare',
    title: 'Results: Comparing Findings',
    phrases: [
      "These results are consistent with those of other studies...",
      "In contrast to earlier findings, however, no evidence of X was detected.",
      "This finding supports previous research into this brain area which links X and Y.",
      "The results obtained in this study mirror those of the previous study.",
      "There is a strong correlation between X and Y.",
      "This outcome is contrary to that of Smith (2022) who found..."
    ]
  },
  {
    id: 'discussion_explain',
    title: 'Discussion: Explaining Results',
    phrases: [
      "A possible explanation for this might be that...",
      "This result may be explained by the fact that...",
      "It is difficult to explain this result, but it might be related to...",
      "There are two likely causes for the difference between...",
      "Another possible explanation for this is that...",
      "This discrepancy could be attributed to..."
    ]
  },
  {
    id: 'conclusion_summary',
    title: 'Conclusion: Summarizing',
    phrases: [
      "The main goal of the current study was to determine...",
      "The findings of this study suggest that...",
      "Taken together, these results provide important insights into...",
      "The present study makes several noteworthy contributions to...",
      "The study has gone some way towards enhancing our understanding of...",
      "The evidence from this study suggests that..."
    ]
  }
];

export const MOCK_FILE_SYSTEM: FileNode[] = [
  {
    id: 'root',
    name: 'Thesis Project',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'literature',
        name: 'Literature Review',
        type: 'folder',
        isOpen: false,
        children: [
          { id: 'ref1', name: 'Smith_2023_Neural_Nets.pdf', type: 'pdf' },
          { id: 'ref2', name: 'Doe_2022_Transformer_Architecture.pdf', type: 'pdf' },
          { id: 'notes1', name: 'Review_Notes.md', type: 'file', content: '# Literature Review Notes\n\n- Smith (2023) argues that...' }
        ]
      },
      {
        id: 'drafts',
        name: 'Drafts',
        type: 'folder',
        isOpen: true,
        children: [
          { 
            id: 'ch1', 
            name: 'Chapter_1_Introduction.md', 
            type: 'file', 
            content: '# Chapter 1: Introduction\n\nThe rapid development of large language models has transformed the landscape of academic writing. However, far too little attention has been paid to privacy concerns in local environments.\n\n## 1.1 Problem Statement\n\nResearchers are increasingly worried about data leakage...' 
          },
          { id: 'ch2', name: 'Chapter_2_Methodology.md', type: 'file', content: '# Chapter 2: Methodology\n\nThis study utilizes a qualitative approach...' }
        ]
      },
      { id: 'bib', name: 'references.bib', type: 'file', content: '@article{smith2023,\n  title={Neural Nets},\n  author={Smith, J.},\n  year={2023}\n}' }
    ]
  }
];