// All data in this file is FIXTURE data for the Phase 1 UI prototype.
// Nothing here is persisted or sent to a server.

export const ME = { id: 'u-alex', name: 'Alex Rivera', initials: 'AR', color: 'var(--accent)' };

export const PEOPLE = {
  'u-alex': ME,
  'u-priya': { id: 'u-priya', name: 'Priya Shah', initials: 'PS', color: 'var(--peer-1)' },
  'u-sam': { id: 'u-sam', name: 'Sam Okafor', initials: 'SO', color: 'var(--peer-2)' },
  'u-jordan': { id: 'u-jordan', name: 'Jordan Lee', initials: 'JL', color: 'var(--peer-3)' },
  'u-mina': { id: 'u-mina', name: 'Mina Park', initials: 'MP', color: 'var(--peer-3)' },
};

const CLEAN_DATA_PY = `"""Clean the raw survey export before analysis."""
import csv
from pathlib import Path

RAW = Path("data/raw_survey.csv")
OUT = Path("data/clean_survey.csv")


def normalise(row):
    row["age"] = int(row["age"]) if row["age"].strip() else None
    row["region"] = row["region"].strip().title()
    return row


def main():
    with RAW.open() as src:
        rows = [normalise(r) for r in csv.DictReader(src)]
    kept = [r for r in rows if r["age"] is not None]
    print(f"Read {len(rows):,} rows, kept {len(kept):,}")

    with OUT.open("w", newline="") as dst:
        writer = csv.DictWriter(dst, fieldnames=kept[0].keys())
        writer.writeheader()
        writer.writerows(kept)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
`;

const README_MD = `# Data Study

Shared analysis of the spring survey export.

- \`clean_data.py\` drops rows without an age and tidies region names.
- \`analysis.ipynb\` explores the cleaned data.

Each person runs Python on their own device. Shared files and notebook
cells sync for everyone; variables stay in your own runtime.
`;

export const DATA_STUDY_NOTEBOOK = [
  {
    id: 'c1',
    type: 'markdown',
    source: '## Survey overview\nLoad the cleaned export and check its shape.',
  },
  {
    id: 'c2',
    type: 'code',
    source: 'import pandas as pd\n\ndf = pd.read_csv("data/clean_survey.csv")\ndf.shape',
    count: 1,
    output: { kind: 'text', text: '(1187, 6)' },
  },
  {
    id: 'c3',
    type: 'code',
    source: 'df.groupby("region")["age"].mean().round(1)',
    count: 2,
    output: {
      kind: 'text',
      text: 'region\nCentral    41.2\nCoastal    37.8\nNorth      44.5\nSouth      39.1\nName: age, dtype: float64',
    },
  },
];

// Canned outputs keyed by trimmed source, used by the simulated runtime.
export const CANNED_OUTPUTS = {
  [DATA_STUDY_NOTEBOOK[1].source.trim()]: '(1187, 6)',
  [DATA_STUDY_NOTEBOOK[2].source.trim()]: DATA_STUDY_NOTEBOOK[2].output.text,
  [CLEAN_DATA_PY.trim()]: 'Read 1,204 rows, kept 1,187\nWrote data/clean_survey.csv',
};

export const UNSUPPORTED_PACKAGES = ['torch', 'tensorflow', 'psycopg2', 'pyodbc'];

export function makeDataStudyFiles() {
  return [
    { id: 'f-nb', name: 'analysis.ipynb', kind: 'notebook', cells: structuredClone(DATA_STUDY_NOTEBOOK) },
    { id: 'f-py', name: 'clean_data.py', kind: 'python', text: CLEAN_DATA_PY },
    { id: 'f-md', name: 'README.md', kind: 'markdown', text: README_MD },
  ];
}

export function makeProjects() {
  return [
    {
      id: 'p-data-study',
      name: 'Data Study',
      ownerId: 'u-alex',
      lastActivity: 'Edited 2 minutes ago by Priya Shah',
      lastActivityShort: '2 min ago',
      members: [
        { userId: 'u-alex', role: 'owner' },
        { userId: 'u-priya', role: 'member' },
        { userId: 'u-sam', role: 'member' },
        { userId: 'u-jordan', role: 'member' },
      ],
      invitations: [{ id: 'i1', email: 'taylor@example.com', sent: 'Sent yesterday' }],
      online: ['u-priya', 'u-sam'],
      files: makeDataStudyFiles(),
    },
    {
      id: 'p-survey',
      name: 'Survey Pipeline',
      ownerId: 'u-mina',
      lastActivity: 'Edited yesterday by Mina Park',
      lastActivityShort: 'Yesterday',
      members: [
        { userId: 'u-mina', role: 'owner' },
        { userId: 'u-alex', role: 'member' },
        { userId: 'u-sam', role: 'member' },
      ],
      invitations: [],
      online: [],
      files: [
        { id: 'f-sp-md', name: 'README.md', kind: 'markdown', text: '# Survey Pipeline\n\nFixture project with a single file.\n' },
      ],
    },
    {
      id: 'p-lab',
      name: 'Lab Notebook',
      ownerId: 'u-alex',
      lastActivity: 'Edited 5 days ago by you',
      lastActivityShort: '5 days ago',
      members: [
        { userId: 'u-alex', role: 'owner' },
        { userId: 'u-jordan', role: 'member' },
      ],
      invitations: [],
      online: [],
      files: [
        { id: 'f-lab-md', name: 'README.md', kind: 'markdown', text: '# Lab Notebook\n\nFixture project with a single file.\n' },
      ],
    },
  ];
}

// Where the simulated teammate cursors sit, per file (0-based line/column).
export const REMOTE_PRESENCE = {
// The selection is the first occurrence of `match` on that line; the cursor sits at its end.
  'f-py': { userId: 'u-priya', line: 10, match: '.strip().title()' },
  'f-nb': { userId: 'u-sam', cellId: 'c3', line: 0, match: '"region"' },
};
