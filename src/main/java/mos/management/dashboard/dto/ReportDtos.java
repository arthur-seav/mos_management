package mos.management.dashboard.dto;

import mos.management.dashboard.entity.OrderSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Sales reports (FR-28, FR-35) and the overview cards. */
public final class ReportDtos {

    private ReportDtos() {
    }

    public record DaySales(LocalDate date, long orders, BigDecimal revenue) {
    }

    public record SourceSales(OrderSource source, long orders, BigDecimal revenue) {
    }

    public record SalesReport(LocalDate from, LocalDate to, long orders, long drinks, BigDecimal revenue,
                              BigDecimal averageOrder, long cancelledOrRejected, List<DaySales> byDay,
                              List<SourceSales> bySource) {
    }

    public record BestSeller(long productId, String productName, long quantity, BigDecimal revenue) {
    }

    /** {@code revenueToday} is null for staff (SA 1.5: no report access). */
    public record Overview(long ordersToday, BigDecimal revenueToday, long placed, long confirmed, long preparing,
                           long ready, long refundsPending, long soldOut, boolean onlineOrderingOpen) {
    }
}
