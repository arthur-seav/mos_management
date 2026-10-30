package mos.management.dashboard.repository;

import mos.management.dashboard.entity.Payment;
import mos.management.dashboard.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByOrderIdAndStatus(Long orderId, PaymentStatus status);

    long countByStatus(PaymentStatus status);
}
