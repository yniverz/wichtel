---
title: Setting up qualifications
description: Create proofs such as food hygiene or first aid, decide how they are shown and attach them to positions as required or “nice to have”.
---

:::tip[At a glance]

- **Create:** _Admin → People → Qualifications_ → _New qualification_ (admins only).
- **Proof:** _Confirmation is enough_, _Upload a document_ or _Confirmation or document_.
- **Documents**: delete after review (default) or keep; optionally _Valid for … days_.
- **Reviewing** is for everyone with the permission _Review and grant qualifications_.
- On a **position**, a qualification is _required_ (blocks booking) or _nice to have_ (just a hint).

:::

## Step by step

1. Open _Qualifications_ and expand _New qualification_.
2. Enter _Name (German)_ and _Name (English)_, e.g. “Food hygiene training”. Volunteers see the
   _Description_ when providing proof – write in it what counts as proof.
3. Choose the _Proof_:
   - _Confirmation is enough_ – volunteers confirm “I confirm that I have this qualification.”
   - _Upload a document_ – a document is required (PDF or photo, max. 10 MB).
   - _Confirmation or document_ – either one is enough (default).
4. Under _Documents_, choose what happens to uploaded proofs after the review: _delete after review_
   (default) or _keep_.
5. Enter a number in _Valid for … days_ if the qualification expires. Empty = unlimited.
6. Leave _Active_ ticked and tap _Create_.

The qualification then appears for volunteers under _Qualifications_, and leads can attach it to
positions.

## Who reviews

Every request lands under _Qualifications_ in _To review_. There it can be approved with _Approve_ or
declined with _Decline_, with an optional _Note to the person_. How this works day to day is described
under [Reviewing qualifications](/wichtel/en/leads/qualifications/).

| Permission                                | Allows                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| _Review and grant qualifications_         | approve or decline requests, grant and revoke qualifications directly             |
| _View uploaded documents_                 | open uploaded documents (_View proof_)                                            |
| Admin                                     | additionally create and change qualifications                                     |

Only give the permission to view documents to the people who really need it. When uploading,
volunteers see: “Only the people reviewing it can see your proof.”

## Expiry

- **Valid for … days** counts from the day of approval, not from the date on the document. When the
  time is up, the qualification shows “expired” for the person and they have to provide it again.
  Until then they can no longer book positions that require it.
- Anyone with a valid qualification cannot request it again.
- A declined request can be made again with _Provide again_.

## Keeping or deleting documents

- _delete after review_: as soon as someone approves or declines, Wichtel deletes the document.
  Volunteers see “The proof is deleted after the review.” when providing it. This is the
  data-minimising choice and right for most cases.
- _keep_: the document stays stored until the person uploads a new one or their account is deleted.
  Only useful if you need to show the proof later.

Mention your choice in the [privacy policy](/wichtel/en/organizers/privacy/).

## Qualifications on positions

When editing a shift, every position has the item _Qualifications_. For each active qualification
you can choose:

- _required_ – only people with the qualification can sign up, join the waiting list or take over the
  shift. Volunteers see “Requires: …” and a link _Provide now_.
- _nice to have_ – never blocks; volunteers see “Nice to have: …”.

Leads with the permission _Override rules (overlaps, deadlines, requirements)_ can add people even
without a required qualification. More under [Positions](/wichtel/en/leads/positions/).

## Common questions

### Can I give someone a qualification without them requesting it?

Yes. On the person's page under _People_ there are _Grant qualification_ and _Revoke_. This requires
the permission _Review and grant qualifications_.

### Can I delete a qualification?

No, only deactivate it: untick _Active_. Volunteers can then no longer request it, and it is no longer
offered for positions.

### Do qualifications apply to all editions?

Yes. Qualifications and the volunteers' proofs belong to the whole installation, not to an edition.
Anyone who provided their food hygiene training once doesn't have to do it again next year – unless
it has expired.

## See also

- [Reviewing qualifications (for leads)](/wichtel/en/leads/qualifications/)
- [Providing qualifications (for volunteers)](/wichtel/en/helpers/qualifications/)
- [Permissions](/wichtel/en/reference/permissions/)
