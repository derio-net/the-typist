# Journal: 2026-10-06-ux-flight-and-pacing

<!-- fr:journal kind=discovery scope=spec id=operator-brief created=2026-10-06T16:20:57+00:00 input=true -->
### operator-brief · discovery · Operator brief (verbatim)

I want a few UX improvements. The explosion once the mothership is destroyed should push the children all the way up to the top of the screen (while still keeping to their own horizontal bands). The plural/secondary ship that is not a sentence should be the lowest down, not the highest up. The sentences should be higher up, the longer they are. The speed of the ships must be calculated on the fly, by the typing speed of the typist, calibrated over the first 50 letters or so. The goal is to give the typist a good chance to type everything. The TTS should come when a ship is first attacked, not once it is destroyed. Questions: The voice is pretty awful, isn't anything better available? Is it possible to have persistence when playing via the github published page? How?

<!-- fr:journal kind=decision scope=spec id=q1-speed-model created=2026-10-06T16:20:57+00:00 -->
### q1-speed-model · decision · Speed model is a bottom-up stack budget

Each released stack descends at a speed where typing it bottom-up at the measured rate, with slack, finishes before each band lands; motherships get the same rule. Set at spawn. (R4)

<!-- fr:journal kind=decision scope=spec id=q2-calibration-memory created=2026-10-06T16:20:57+00:00 -->
### q2-calibration-memory · decision · Calibrated rate is remembered across sessions

Stored in localStorage; a fresh browser starts from a 2.0 chars/s prior and calibrates over the first 50 letters. (R3, R5)

<!-- fr:journal kind=decision scope=spec id=q3-slack created=2026-10-06T16:20:57+00:00 -->
### q3-slack · decision · Slack 1.5x typing time

Fixed, no setting. (R4)

<!-- fr:journal kind=decision scope=spec id=q4-no-wave-ramp created=2026-10-06T16:20:57+00:00 -->
### q4-no-wave-ramp · decision · No difficulty ramp across waves

Speed tracks only the typing rate; the wave number no longer changes speed. (R4)

<!-- fr:journal kind=decision scope=spec id=q5-voice created=2026-10-06T16:20:57+00:00 -->
### q5-voice · decision · Voice ranking, picker with Test, and install hint

Rank German voices (quality markers, Google Deutsch, others, novelty last); Settings voice picker with Test and an install hint. Pre-recorded neural audio declined. (R7, R8)

<!-- fr:journal kind=decision scope=spec id=q6-persistence created=2026-10-06T16:20:57+00:00 -->
### q6-persistence · decision · persist() plus export/import progress

Progress already persists per browser on Pages (IndexedDB). Add navigator.storage.persist() and Export/Import of a JSON progress file. Cloud sync out of scope. (R9, R10)

<!-- fr:journal kind=decision scope=spec id=q7-test-plan created=2026-10-06T16:20:57+00:00 -->
### q7-test-plan · decision · Post-merge Test Plan is one live session on Pages

Operator plays one session on the live site per the spec's Test Plan.
