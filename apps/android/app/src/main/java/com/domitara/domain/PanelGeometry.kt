package com.domitara.domain

import com.domitara.data.dto.BreakerType
import com.domitara.data.dto.ElectricalBreaker

/**
 * Kotlin port of packages/panel-core (types.ts + computeSlots.ts) from the old
 * TypeScript monorepo package. Pure logic, no Android dependencies, so it can be
 * unit-tested directly (see ComputeSlotsTest).
 */

enum class SlotCol { LEFT, RIGHT, FULL }

enum class SlotState { OCCUPIED, BLANK, DOUBLE_POLE_SECONDARY, MAIN }

data class SlotGeometry(
    val slot: Int,
    val col: SlotCol,
    val row: Int,
    val rowSpan: Int,
    val state: SlotState,
    val breaker: ElectricalBreaker?,
    val isUnlabeled: Boolean,
)

private val AMPS_TO_DEFAULT_SLOTS = mapOf(
    100 to 20,
    150 to 30,
    200 to 40,
    400 to 84,
)

fun defaultSlotsForAmps(amps: Int): Int = AMPS_TO_DEFAULT_SLOTS[amps] ?: 20

/**
 * Computes render geometry for every slot in a panel (1..totalSlots), accounting
 * for double-pole breakers, main breaker placement, and blank fill.
 *
 * Row numbering starts at 1. The main breaker (if any) occupies row 1 spanning
 * both columns; the breaker grid is shifted down one row beneath it. A slot's row
 * is derived directly from its number — slots 1 & 2 share a row, 3 & 4 the next,
 * etc. (`row = ceil(slot / 2)`) — so double-pole and main breakers can't desync
 * the two columns from each other.
 */
fun computeSlots(totalSlots: Int, breakers: List<ElectricalBreaker>): List<SlotGeometry> {
    val breakerBySlot = HashMap<Int, ElectricalBreaker>()
    for (b in breakers) breakerBySlot[b.slot] = b

    val mainBreaker = breakers.firstOrNull { it.breakerType == BreakerType.MAIN }
    // Breaker rows sit beneath the full-width main breaker row when one exists.
    val rowOffset = if (mainBreaker != null) 1 else 0

    val result = ArrayList<SlotGeometry>()

    if (mainBreaker != null) {
        result.add(
            SlotGeometry(
                slot = mainBreaker.slot,
                col = SlotCol.FULL,
                row = 1,
                rowSpan = 1,
                state = SlotState.MAIN,
                breaker = mainBreaker,
                isUnlabeled = mainBreaker.label.isNullOrEmpty(),
            ),
        )
    }

    // Track which slots have been rendered (secondary slot of a double-pole).
    val rendered = HashSet<Int>()
    if (mainBreaker != null) rendered.add(mainBreaker.slot)

    var slot = 1
    while (slot <= totalSlots) {
        if (rendered.contains(slot)) {
            slot++
            continue
        }

        val breaker = breakerBySlot[slot]
        val isOdd = slot % 2 == 1
        val col = if (isOdd) SlotCol.LEFT else SlotCol.RIGHT
        // Physical row from the slot number; main (if any) pushes the grid down.
        val row = (slot + 1) / 2 + rowOffset

        if (breaker?.breakerType == BreakerType.DOUBLE_POLE) {
            // Double-pole: stays in its own column (left for odd, right for even)
            // and pairs with the same-column slot two positions ahead, spanning two
            // rows. If that paired slot is past the panel's capacity there is no
            // room to span, so render it as a single slot instead of overflowing.
            val canSpan = slot + 2 <= totalSlots
            result.add(
                SlotGeometry(
                    slot = slot,
                    col = col,
                    row = row,
                    rowSpan = if (canSpan) 2 else 1,
                    state = SlotState.OCCUPIED,
                    breaker = breaker,
                    isUnlabeled = breaker.label.isNullOrEmpty(),
                ),
            )
            rendered.add(slot)
            if (canSpan) rendered.add(slot + 2) // secondary same-column slot consumed
        } else {
            // Regular single-slot breaker or blank.
            result.add(
                SlotGeometry(
                    slot = slot,
                    col = col,
                    row = row,
                    rowSpan = 1,
                    state = if (breaker != null) SlotState.OCCUPIED else SlotState.BLANK,
                    breaker = breaker,
                    isUnlabeled = if (breaker != null) breaker.label.isNullOrEmpty() else false,
                ),
            )
            rendered.add(slot)
        }
        slot++
    }

    // Sort: main first, then by row then col.
    val colOrder = mapOf(SlotCol.LEFT to 0, SlotCol.FULL to 1, SlotCol.RIGHT to 2)
    return result.sortedWith(Comparator { a, b ->
        if (a.state == SlotState.MAIN) return@Comparator -1
        if (b.state == SlotState.MAIN) return@Comparator 1
        if (a.row != b.row) return@Comparator a.row - b.row
        (colOrder[a.col] ?: 0) - (colOrder[b.col] ?: 0)
    })
}
