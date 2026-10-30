package mos.management.dashboard.repository;

import mos.management.dashboard.entity.Order;
import mos.management.dashboard.entity.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    List<Order> findByStatusIn(Collection<OrderStatus> statuses);

    List<Order> findByCustomerIdAndStatusNotOrderByCreatedAtDesc(Long customerId, OrderStatus excluded);

    List<Order> findByStatusAndCreatedAtBefore(OrderStatus status, Instant before);

    @Override
    Page<Order> findAll(Specification<Order> spec, Pageable pageable);

    @Query("""
            select o from Order o
            where o.placedAt >= :from and o.placedAt < :to
            """)
    List<Order> findPlacedBetween(@Param("from") Instant from, @Param("to") Instant to);

    @Query("select count(o) from Order o where o.placedAt >= :from and o.placedAt < :to")
    long countPlacedBetween(@Param("from") Instant from, @Param("to") Instant to);
}
