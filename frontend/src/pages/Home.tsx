import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useNavigate } from "react-router-dom";

type Cove = { id: string; name: string; members: number };

const seed: Cove[] = [
  { id: "leetcode", name: "LeetCode Tracker", members: 3 },
  { id: "hackathon", name: "Hackathon Sprint", members: 5 },
  { id: "research", name: "Research Group", members: 4 },
];

export default function Home() {
  const [coves, setCoves] = useState<Cove[]>(seed);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();

  const createCove = () => {
    if (!newName.trim()) return;
    const id = newName.toLowerCase().replace(/\s+/g, "-");
    setCoves([{ id, name: newName, members: 1 }, ...coves]);
    setNewName("");
    navigate(`/cove/${id}`);
  };

  return (
    <div className="space-y-6">
      <section className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Welcome to CoveStack</h1>
          <p className="text-sm text-muted-foreground">
            Choose an existing cove or start a new one.
          </p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>Start a New Cove</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a Cove</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Cove name (e.g., Interview Prep)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button onClick={createCove} className="w-full">
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {coves.map((c) => (
          <Card
            key={c.id}
            className="cursor-pointer transition hover:shadow-md"
            onClick={() => navigate(`/cove/${c.id}`)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{c.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{c.members} members</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
