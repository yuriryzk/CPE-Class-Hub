const GROUPS = [["", "Whole class"], ["G1", "G1 only"], ["G2", "G2 only"]];

export default function GroupSelect({ value }: { value?: string }) {
  return (
    <label>Group
      <select name="lab_group" defaultValue={value}>{GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </label>
  );
}
