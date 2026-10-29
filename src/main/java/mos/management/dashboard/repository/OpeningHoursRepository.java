package mos.management.dashboard.repository;

import mos.management.dashboard.entity.OpeningHours;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OpeningHoursRepository extends JpaRepository<OpeningHours, Short> {

    List<OpeningHours> findAllByOrderByDayOfWeekAsc();
}
