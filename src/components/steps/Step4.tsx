import { useFormContext } from '@/contexts/FormContext';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Step4 = () => {
  const { formData, updateFormData } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Movement & Mobility</h2>
        <p className="text-muted-foreground">Functional movement screening and mobility tests</p>
      </div>

      <div className="space-y-6">
        {/* Overhead Squat Section */}
        <Card>
          <CardHeader>
            <CardTitle>Overhead Squat</CardTitle>
            <CardDescription>
              Ask the client to stand with feet shoulder-width apart, arms straight overhead, and perform 5 slow bodyweight squats. Watch knee alignment, torso angle, hip shift, depth, and foot/heel behaviour.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overheadSquatKneeAlignment">Overhead Squat – Knee Alignment</Label>
              <Select
                value={formData.overheadSquatKneeAlignment}
                onValueChange={(value) => updateFormData({ overheadSquatKneeAlignment: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select knee alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-issue">No issue – knees track over toes</SelectItem>
                  <SelectItem value="mild-cave">Mild cave-in (valgus)</SelectItem>
                  <SelectItem value="severe-cave">Severe cave-in (valgus)</SelectItem>
                  <SelectItem value="knees-out">Knees push out excessively</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how the knees move relative to the toes during the squat.
              </p>
            </div>

            <div>
              <Label htmlFor="overheadSquatTorsoLean">Overhead Squat – Torso Lean</Label>
              <Select
                value={formData.overheadSquatTorsoLean}
                onValueChange={(value) => updateFormData({ overheadSquatTorsoLean: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select torso lean" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upright">Upright – no excessive lean</SelectItem>
                  <SelectItem value="mild-lean">Mild forward lean</SelectItem>
                  <SelectItem value="excessive-lean">Excessive forward lean</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How far the chest/torso leans forward when squatting.
              </p>
            </div>

            <div>
              <Label htmlFor="overheadSquatHipShift">Overhead Squat – Hip Shift</Label>
              <Select
                value={formData.overheadSquatHipShift}
                onValueChange={(value) => updateFormData({ overheadSquatHipShift: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select hip shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-shift">No visible shift</SelectItem>
                  <SelectItem value="shift-left">Shifts left</SelectItem>
                  <SelectItem value="shift-right">Shifts right</SelectItem>
                  <SelectItem value="shift-unstable">Shifts side-to-side / unstable</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Does the pelvis shift noticeably to one side when squatting?
              </p>
            </div>

            <div>
              <Label htmlFor="overheadSquatDepth">Overhead Squat – Squat Depth</Label>
              <Select
                value={formData.overheadSquatDepth}
                onValueChange={(value) => updateFormData({ overheadSquatDepth: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select squat depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-depth">Full depth – hips at or below knee level</SelectItem>
                  <SelectItem value="mid-range">Mid range – just above parallel</SelectItem>
                  <SelectItem value="shallow">Shallow – partial squat only</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How low the client can comfortably squat with control.
              </p>
            </div>

            <div>
              <Label htmlFor="overheadSquatFootHeel">Overhead Squat – Foot / Heel Behaviour</Label>
              <Select
                value={formData.overheadSquatFootHeel}
                onValueChange={(value) => updateFormData({ overheadSquatFootHeel: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select foot/heel behaviour" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="heels-down">Heels stay down, feet stable</SelectItem>
                  <SelectItem value="heels-lift">Heels lift off the floor</SelectItem>
                  <SelectItem value="feet-roll-in">Feet roll in (pronation)</SelectItem>
                  <SelectItem value="feet-roll-out">Feet roll out (supination)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                What happens at the feet and heels during the squat.
              </p>
            </div>

            <div>
              <Label htmlFor="overheadSquatNotes">Overhead Squat – Coach Notes (optional)</Label>
              <Textarea
                id="overheadSquatNotes"
                value={formData.overheadSquatNotes}
                onChange={(e) => updateFormData({ overheadSquatNotes: e.target.value })}
                placeholder="Record anything unusual..."
                className="mt-1 min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Record anything unusual about the overhead squat (e.g. pain, noise, asymmetry). Internal use only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lunge Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Lunge Test</CardTitle>
            <CardDescription>
              Ask the client to step into a forward lunge on each leg, hands on hips, for 5 reps per side. Watch the front knee, balance, and torso position.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Side */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm uppercase text-muted-foreground">Left Side</h3>
                
                <div>
                  <Label htmlFor="lungeLeftKneeAlignment">Lunge – Left Front Knee Alignment</Label>
                  <Select
                    value={formData.lungeLeftKneeAlignment}
                    onValueChange={(value) => updateFormData({ lungeLeftKneeAlignment: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select alignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracks-center">Tracks over middle toes</SelectItem>
                      <SelectItem value="caves-inward">Caves inward</SelectItem>
                      <SelectItem value="pushes-out">Pushes out</SelectItem>
                      <SelectItem value="wobbles">Wobbles in and out</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    What the front knee does during the left-leg lunge.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lungeLeftBalance">Lunge – Left Balance / Stability</Label>
                  <Select
                    value={formData.lungeLeftBalance}
                    onValueChange={(value) => updateFormData({ lungeLeftBalance: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select balance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">Stable – no wobble</SelectItem>
                      <SelectItem value="slight-wobble">Slight wobble</SelectItem>
                      <SelectItem value="unstable">Very unstable / loss of balance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    How steady the client looks when lunging on the left leg.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lungeLeftTorso">Lunge – Left Torso Posture</Label>
                  <Select
                    value={formData.lungeLeftTorso}
                    onValueChange={(value) => updateFormData({ lungeLeftTorso: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select torso posture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upright">Upright torso</SelectItem>
                      <SelectItem value="mild-lean">Mild forward lean</SelectItem>
                      <SelectItem value="excessive-lean">Excessive forward lean / rounding</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    How much the upper body leans when lunging on the left leg.
                  </p>
                </div>
              </div>

              {/* Right Side */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm uppercase text-muted-foreground">Right Side</h3>
                
                <div>
                  <Label htmlFor="lungeRightKneeAlignment">Lunge – Right Front Knee Alignment</Label>
                  <Select
                    value={formData.lungeRightKneeAlignment}
                    onValueChange={(value) => updateFormData({ lungeRightKneeAlignment: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select alignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracks-center">Tracks over middle toes</SelectItem>
                      <SelectItem value="caves-inward">Caves inward</SelectItem>
                      <SelectItem value="pushes-out">Pushes out</SelectItem>
                      <SelectItem value="wobbles">Wobbles in and out</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    What the front knee does during the right-leg lunge.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lungeRightBalance">Lunge – Right Balance / Stability</Label>
                  <Select
                    value={formData.lungeRightBalance}
                    onValueChange={(value) => updateFormData({ lungeRightBalance: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select balance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stable">Stable – no wobble</SelectItem>
                      <SelectItem value="slight-wobble">Slight wobble</SelectItem>
                      <SelectItem value="unstable">Very unstable / loss of balance</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    How steady the client looks when lunging on the right leg.
                  </p>
                </div>

                <div>
                  <Label htmlFor="lungeRightTorso">Lunge – Right Torso Posture</Label>
                  <Select
                    value={formData.lungeRightTorso}
                    onValueChange={(value) => updateFormData({ lungeRightTorso: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select torso posture" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upright">Upright torso</SelectItem>
                      <SelectItem value="mild-lean">Mild forward lean</SelectItem>
                      <SelectItem value="excessive-lean">Excessive forward lean / rounding</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    How much the upper body leans when lunging on the right leg.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="lungeTestNotes">Lunge Test – Coach Notes (optional)</Label>
              <Textarea
                id="lungeTestNotes"
                value={formData.lungeTestNotes}
                onChange={(e) => updateFormData({ lungeTestNotes: e.target.value })}
                placeholder="Use for any side-to-side differences or pain reported..."
                className="mt-1 min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use for any side-to-side differences or pain reported in the lunge test.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Overhead Reach Section */}
        <Card>
          <CardHeader>
            <CardTitle>Overhead Reach Test</CardTitle>
            <CardDescription>
              Ask the client to stand tall, keep ribs and lower back still, and slowly raise both arms overhead. Do not allow them to lean back to cheat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="overheadReachResult">Overhead Reach Result</Label>
              <Select
                value={formData.overheadReachResult}
                onValueChange={(value) => updateFormData({ overheadReachResult: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-range">Full range – arms in line with ears, no compensation</SelectItem>
                  <SelectItem value="limited-range">Limited range – arms stay in front of ears</SelectItem>
                  <SelectItem value="limited-with-arch">Limited range with low-back arch</SelectItem>
                  <SelectItem value="pain-reported">Pain or discomfort reported</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Overall outcome of the overhead reach without using the lower back to cheat.
              </p>
            </div>

            <div>
              <Label htmlFor="shoulderMobilityRating">Shoulder Mobility Rating</Label>
              <Select
                value={formData.shoulderMobilityRating}
                onValueChange={(value) => updateFormData({ shoulderMobilityRating: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="ok">OK – some restriction</SelectItem>
                  <SelectItem value="poor">Poor – very restricted</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                Coach's overall impression of shoulder mobility.
              </p>
            </div>

            <div>
              <Label htmlFor="overheadReachNotes">Overhead Reach – Coach Notes (optional)</Label>
              <Textarea
                id="overheadReachNotes"
                value={formData.overheadReachNotes}
                onChange={(e) => updateFormData({ overheadReachNotes: e.target.value })}
                placeholder="Details about where the restriction or pain appears..."
                className="mt-1 min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Details about where the restriction or pain appears (front of shoulder, top, etc.).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ankle / Lower-Limb Mobility Section */}
        <Card>
          <CardHeader>
            <CardTitle>Ankle / Lower-Limb Mobility</CardTitle>
            <CardDescription>
              Based on squat, lunge, and any specific ankle checks (e.g. knee-to-wall test), rate overall ankle / lower-limb mobility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ankleMobilityRating">Ankle Mobility Rating</Label>
              <Select
                value={formData.ankleMobilityRating}
                onValueChange={(value) => updateFormData({ ankleMobilityRating: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="ok">OK – some restriction</SelectItem>
                  <SelectItem value="poor">Poor – very restricted</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                How freely the ankles move for deep squats and lunges.
              </p>
            </div>

            <div>
              <Label htmlFor="ankleMobilityNotes">Ankle / Lower-Limb – Coach Notes (optional)</Label>
              <Textarea
                id="ankleMobilityNotes"
                value={formData.ankleMobilityNotes}
                onChange={(e) => updateFormData({ ankleMobilityNotes: e.target.value })}
                placeholder="Use for notes on calves, Achilles, or any ankle-specific test..."
                className="mt-1 min-h-[80px]"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Use for notes on calves, Achilles, or any ankle-specific test you run.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Step4;
