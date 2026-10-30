package mos.management.dashboard.service.report;

import mos.management.dashboard.dto.ReportDtos.BestSeller;
import mos.management.dashboard.dto.ReportDtos.DaySales;
import mos.management.dashboard.dto.ReportDtos.Overview;
import mos.management.dashboard.dto.ReportDtos.SalesReport;
import mos.management.dashboard.dto.ReportDtos.SourceSales;
import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderItem;
import mos.management.dashboard.entity.OrderSource;
import mos.management.dashboard.entity.OrderStatus;
import mos.management.dashboard.entity.PaymentStatus;
import mos.management.dashboard.entity.Product;
import mos.management.dashboard.exception.ApiException;
import mos.management.dashboard.repository.OrderRepository;
import mos.management.dashboard.repository.PaymentRepository;
import mos.management.dashboard.repository.ProductRepository;
import mos.management.dashboard.service.store.StoreService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Sales for a chosen period (FR-28, 9.3), best-selling drinks (FR-35) and
 * the overview cards. A sale is an order that reached staff (placed) in the
 * period and was not cancelled, rejected or abandoned; days are store days.
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

    public static final int MAX_DAYS = 366;

    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final ProductRepository products;
    private final StoreService store;
    private final Clock clock;

    public ReportService(OrderRepository orders, PaymentRepository payments, ProductRepository products,
                         StoreService store, Clock clock) {
        this.orders = orders;
        this.payments = payments;
        this.products = products;
        this.store = store;
        this.clock = clock;
    }

    public record Period(LocalDate from, LocalDate to) {
    }

    /** Defaults to the last 7 store days, today included. */
    public Period period(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(clock.withZone(store.zone()));
        LocalDate t = to != null ? to : today;
        LocalDate f = from != null ? from : t.minusDays(6);
        if (f.isAfter(t)) throw ApiException.badRequest("bad_period", "The start date is after the end date.");
        if (f.plusDays(MAX_DAYS).isBefore(t)) throw ApiException.badRequest("bad_period", "Pick a period of one year or less.");
        return new Period(f, t);
    }

    /** Orders placed in the period, with items loaded. */
    public List<Order> placedIn(Period p) {
        ZoneId zone = store.zone();
        Instant start = p.from().atStartOfDay(zone).toInstant();
        Instant end = p.to().plusDays(1).atStartOfDay(zone).toInstant();
        List<Order> list = orders.findPlacedBetween(start, end);
        list.forEach(o -> o.getItems().size());
        return list;
    }

    public SalesReport sales(Period p) {
        ZoneId zone = store.zone();
        List<Order> placed = placedIn(p);
        List<Order> sales = placed.stream().filter(o -> o.getStatus().isSale()).toList();

        Map<LocalDate, List<Order>> byDate = new LinkedHashMap<>();
        for (LocalDate d = p.from(); !d.isAfter(p.to()); d = d.plusDays(1)) byDate.put(d, new ArrayList<>());
        sales.forEach(o -> byDate.get(o.getPlacedAt().atZone(zone).toLocalDate()).add(o));
        List<DaySales> byDay = byDate.entrySet().stream()
                .map(e -> new DaySales(e.getKey(), e.getValue().size(), total(e.getValue()))).toList();

        Map<OrderSource, List<Order>> bySourceMap = new EnumMap<>(OrderSource.class);
        for (OrderSource s : OrderSource.values()) bySourceMap.put(s, new ArrayList<>());
        sales.forEach(o -> bySourceMap.get(o.getSource()).add(o));
        List<SourceSales> bySource = bySourceMap.entrySet().stream()
                .map(e -> new SourceSales(e.getKey(), e.getValue().size(), total(e.getValue()))).toList();

        BigDecimal revenue = total(sales);
        BigDecimal average = sales.isEmpty() ? BigDecimal.ZERO.setScale(2)
                : revenue.divide(BigDecimal.valueOf(sales.size()), 2, RoundingMode.HALF_UP);
        long drinks = sales.stream().mapToLong(Order::drinkCount).sum();
        long calledOff = placed.stream().filter(o -> o.getStatus().endedEarly()).count();
        return new SalesReport(p.from(), p.to(), sales.size(), drinks, revenue, average, calledOff, byDay, bySource);
    }

    /** FR-35: by cups sold, then revenue. */
    public List<BestSeller> bestSellers(Period p, int limit) {
        record Acc(long productId, String name, long qty, BigDecimal revenue) {
        }
        Map<Long, Acc> acc = new LinkedHashMap<>();
        for (Order o : placedIn(p)) {
            if (!o.getStatus().isSale()) continue;
            for (OrderItem i : o.getItems()) {
                long id = i.getProduct().getId();
                Acc a = acc.get(id);
                acc.put(id, a == null
                        ? new Acc(id, i.getProductName(), i.getQuantity(), i.getLineTotal())
                        : new Acc(id, a.name(), a.qty() + i.getQuantity(), a.revenue().add(i.getLineTotal())));
            }
        }
        return acc.values().stream()
                .sorted(Comparator.comparingLong(Acc::qty).reversed().thenComparing(Acc::revenue, Comparator.reverseOrder()))
                .limit(Math.clamp(limit, 1, 50))
                .map(a -> new BestSeller(a.productId(), a.name(), a.qty(), a.revenue()))
                .toList();
    }

    /** For the app's "Popular now": best sellers of the last 30 days still on the menu, then the menu order. */
    public List<Product> popular(int limit) {
        int n = Math.clamp(limit, 1, 20);
        Map<Long, Product> onMenu = products.findOnMenu().stream()
                .collect(Collectors.toMap(Product::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        List<Product> result = new ArrayList<>();
        for (BestSeller b : bestSellers(period(LocalDate.now(clock.withZone(store.zone())).minusDays(29), null), 50)) {
            Product p = onMenu.remove(b.productId());
            if (p != null && result.size() < n) result.add(p);
        }
        for (Product p : onMenu.values()) {
            if (result.size() >= n) break;
            result.add(p);
        }
        return result;
    }

    public Overview overview(boolean includeRevenue) {
        LocalDate today = LocalDate.now(clock.withZone(store.zone()));
        List<Order> sales = placedIn(new Period(today, today)).stream().filter(o -> o.getStatus().isSale()).toList();
        Map<OrderStatus, Long> queue = orders.findByStatusIn(List.of(OrderStatus.PLACED, OrderStatus.CONFIRMED,
                        OrderStatus.PREPARING, OrderStatus.READY)).stream()
                .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));
        long soldOut = products.findOnMenu().stream().filter(pr -> !pr.isAvailable()).count();
        return new Overview(sales.size(), includeRevenue ? total(sales) : null,
                queue.getOrDefault(OrderStatus.PLACED, 0L), queue.getOrDefault(OrderStatus.CONFIRMED, 0L),
                queue.getOrDefault(OrderStatus.PREPARING, 0L), queue.getOrDefault(OrderStatus.READY, 0L),
                payments.countByStatus(PaymentStatus.REFUND_PENDING), soldOut, store.current().isOnlineOrderingOpen());
    }

    static BigDecimal total(List<Order> list) {
        return list.stream().map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }
}
