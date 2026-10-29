package mos.management.dashboard.repository;

import mos.management.dashboard.entity.SavedCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedCardRepository extends JpaRepository<SavedCard, Long> {

    List<SavedCard> findByUserIdOrderByIdAsc(Long userId);

    Optional<SavedCard> findByIdAndUserId(Long id, Long userId);
}
