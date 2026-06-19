package com.domitara.domain

import com.domitara.data.dto.BreakerType
import com.domitara.data.dto.ElectricalBreaker
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ComputeSlotsTest {

    private fun breaker(
        slot: Int,
        type: BreakerType = BreakerType.STANDARD,
        label: String? = "L$slot",
    ) = ElectricalBreaker(
        id = "b$slot",
        panelId = "p",
        slot = slot,
        label = label,
        amps = 20,
        breakerType = type,
        isGfci = false,
        isAfci = false,
        notes = null,
        floorPlanAreaId = null,
        createdAt = "",
        updatedAt = "",
    )

    @Test
    fun defaultSlots_knownAndUnknownAmps() {
        assertEquals(20, defaultSlotsForAmps(100))
        assertEquals(30, defaultSlotsForAmps(150))
        assertEquals(40, defaultSlotsForAmps(200))
        assertEquals(84, defaultSlotsForAmps(400))
        assertEquals(20, defaultSlotsForAmps(125)) // fallback
    }

    @Test
    fun blankPanel_allBlanks_correctColsAndRows() {
        val slots = computeSlots(4, emptyList())
        assertEquals(4, slots.size)
        // slot 1 -> left/row1, 2 -> right/row1, 3 -> left/row2, 4 -> right/row2
        val s1 = slots.first { it.slot == 1 }
        val s2 = slots.first { it.slot == 2 }
        val s3 = slots.first { it.slot == 3 }
        val s4 = slots.first { it.slot == 4 }
        assertEquals(SlotCol.LEFT, s1.col); assertEquals(1, s1.row)
        assertEquals(SlotCol.RIGHT, s2.col); assertEquals(1, s2.row)
        assertEquals(SlotCol.LEFT, s3.col); assertEquals(2, s3.row)
        assertEquals(SlotCol.RIGHT, s4.col); assertEquals(2, s4.row)
        slots.forEach { assertEquals(SlotState.BLANK, it.state); assertNull(it.breaker) }
    }

    @Test
    fun mainBreaker_occupiesRow1FullWidth_othersShiftDown() {
        val main = breaker(1, BreakerType.MAIN)
        val slots = computeSlots(4, listOf(main, breaker(2), breaker(3)))
        val mainGeom = slots.first()
        assertEquals(SlotState.MAIN, mainGeom.state)
        assertEquals(SlotCol.FULL, mainGeom.col)
        assertEquals(1, mainGeom.row)
        // slot 1 is consumed by main; regular grid starts at row 2
        assertTrue(slots.none { it.slot == 1 && it.state != SlotState.MAIN })
        // The main consumes slot 1, so slot 2 (even) sits alone in row 2 and the
        // grid row advances; slot 3 (odd) therefore lands in row 3. This matches
        // the original panel-core algorithm exactly.
        val s2 = slots.first { it.slot == 2 }
        assertEquals(2, s2.row)
        assertEquals(SlotCol.RIGHT, s2.col)
        val s3 = slots.first { it.slot == 3 }
        assertEquals(3, s3.row)
        assertEquals(SlotCol.LEFT, s3.col)
    }

    @Test
    fun doublePole_spansTwoRows_consumesSlotPlusTwo() {
        val dp = breaker(1, BreakerType.DOUBLE_POLE)
        val slots = computeSlots(4, listOf(dp))
        val dpGeom = slots.first { it.slot == 1 }
        assertEquals(2, dpGeom.rowSpan)
        assertEquals(SlotCol.LEFT, dpGeom.col)
        assertEquals(SlotState.OCCUPIED, dpGeom.state)
        // slot 3 (1 + 2) is consumed and not rendered separately
        assertTrue(slots.none { it.slot == 3 })
    }

    @Test
    fun doublePole_onEvenSlot_doesNotCollideWithNextOddSlot() {
        // DP on slot 2 (right column) must not push the following odd slot into the
        // same cell as slot 1. Each left slot keeps its own row.
        val slots = computeSlots(4, listOf(breaker(2, BreakerType.DOUBLE_POLE)))
        val s1 = slots.first { it.slot == 1 }
        val s2 = slots.first { it.slot == 2 }
        val s3 = slots.first { it.slot == 3 }
        assertEquals(SlotCol.LEFT, s1.col); assertEquals(1, s1.row)
        assertEquals(SlotCol.RIGHT, s2.col); assertEquals(1, s2.row); assertEquals(2, s2.rowSpan)
        assertEquals(SlotCol.LEFT, s3.col); assertEquals(2, s3.row)
        // slot 4 is the consumed second pole of the double-pole.
        assertTrue(slots.none { it.slot == 4 })
        // No two rendered slots may share the same column and row.
        val cells = slots.map { it.col to it.row }
        assertEquals(cells.size, cells.toSet().size)
    }

    @Test
    fun doublePole_onLastOddSlot_doesNotOverflowPanel() {
        // DP on the last left slot has no paired slot (slot+2 > totalSlots), so it
        // renders as a single row and never extends past the panel's last row.
        val slots = computeSlots(4, listOf(breaker(3, BreakerType.DOUBLE_POLE)))
        val s3 = slots.first { it.slot == 3 }
        assertEquals(1, s3.rowSpan)
        val maxRow = slots.maxOf { it.row + it.rowSpan - 1 }
        assertEquals(2, maxRow) // 4 slots -> 2 rows, no phantom 3rd row
    }

    @Test
    fun unlabeledBreaker_isFlagged() {
        val slots = computeSlots(2, listOf(breaker(1, label = null), breaker(2, label = "Kitchen")))
        assertTrue(slots.first { it.slot == 1 }.isUnlabeled)
        assertTrue(!slots.first { it.slot == 2 }.isUnlabeled)
    }

    @Test
    fun resultSortedByRowThenCol_mainFirst() {
        val main = breaker(1, BreakerType.MAIN)
        val slots = computeSlots(4, listOf(main, breaker(2), breaker(3), breaker(4)))
        assertEquals(SlotState.MAIN, slots.first().state)
        // Verify non-main entries are ordered by (row, col)
        val rest = slots.drop(1)
        val colOrder = mapOf(SlotCol.LEFT to 0, SlotCol.FULL to 1, SlotCol.RIGHT to 2)
        for (i in 1 until rest.size) {
            val prev = rest[i - 1]; val cur = rest[i]
            val prevKey = prev.row * 10 + (colOrder[prev.col] ?: 0)
            val curKey = cur.row * 10 + (colOrder[cur.col] ?: 0)
            assertTrue("expected sorted order", prevKey <= curKey)
        }
    }
}
