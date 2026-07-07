---
sidebar_position: 1
---

# Inventory & Items

Items are the core record in Domitara. Every item belongs to a home, and optionally to a
location, one or more labels, and (if it's an appliance or piece of equipment) a maintenance
schedule.

![All items grid](/img/web/items-grid.png)

## Adding an item

Click **Add item** from the Dashboard or the **All items** screen. The add-item form is split
into sections so you only have to fill in what matters to you:

- **Basics** — name and description (required: name only)
- **Organization** — location, labels, status (`owned`, `loaned`, `missing`), quantity
- **Product details** — manufacturer, model, serial number
- **Purchase & value** — purchase price, purchase date, warranty text, an **insured** toggle
- **Asset ID** — an auto-generated code (`DT-XXXXXX`) used for QR labels; see
  [Asset IDs](./asset-ids)
- **Custom fields** — add your own `label: value` pairs (with an optional unit) for anything
  the built-in fields don't cover — filter MERV rating, tank capacity, tire size, paint color,
  whatever's useful for that item
- **Notes** — free-form text

Locations and labels can be created inline from the form (there's a small "+ new" link next to
each picker) so you don't have to leave the page to set up your organization scheme first.

## Item details

Opening an item shows:

- A photo carousel (drag-and-drop or click to upload JPEG/PNG/WEBP, up to 10 MB each)
- Its asset ID, status, location breadcrumb, insured flag, purchase date, and value at a glance
- Tabs for **Overview** (description, labels, product details, custom fields, notes),
  **Documents** (receipts, manuals, warranty PDFs — PDF/JPG/PNG up to 10 MB), **Maintenance**
  (logs scoped to this item), and **History**

![Item detail](/img/web/item-detail.png)

## Editing and deleting

Use **Edit** on the item detail page to change any field. **Delete** requires confirmation and
cannot be undone — deleting an item also removes its photos and documents.

## Custom fields

Custom fields are per-item and fully free-form: you choose the label, the value, and
(optionally) a unit, e.g. `Filter size: 20x25x1 in` or `Tank capacity: 50 gal`. There's no
shared schema across items — they're meant for one-off details rather than structured
attributes you'd filter or sort by.
